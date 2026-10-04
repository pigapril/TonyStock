import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import MomentumDashboardTour from './MomentumDashboardTour';
import { hasSeenMomentumTour, markMomentumTourSeen, TOUR_STORAGE_KEY } from './tourStorage';

const text = key => key;
const selectors = ['momentum-primary-tabs', 'momentum-controls', 'momentum-tile', 'momentum-row'];
let targets;
beforeEach(() => {
  jest.useFakeTimers();
  Element.prototype.scrollIntoView = jest.fn();
  targets = document.createElement('div'); targets.className = 'momentum-page'; document.body.appendChild(targets);
});
afterEach(() => { targets.remove(); jest.clearAllTimers(); jest.useRealTimers(); });
const addTargets = () => selectors.forEach(className => {
  const target = document.createElement('div'); target.className = className;
  target.getBoundingClientRect = () => ({top:100,left:40,width:280,height:70}); targets.appendChild(target);
});

test('advances through four real targets, supports Back, and completes', () => {
 addTargets(); const finish=jest.fn();render(<MomentumDashboardTour text={text} onFinish={finish} />);
 expect(screen.getByText('1 / 4')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'tour.next'})).toHaveFocus();
 for(let i=0;i<3;i+=1)fireEvent.click(screen.getByRole('button',{name:'tour.next'}));
 expect(screen.getByText('tour.asset.title')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'tour.back'}));
 expect(screen.getByText('tour.map.title')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'tour.next'}));
 fireEvent.click(screen.getByRole('button',{name:'tour.done'}));expect(finish).toHaveBeenCalledTimes(1);
});

test('missing targets skip forward to a dismissible final fallback', () => {
 const finish=jest.fn();render(<MomentumDashboardTour text={text} onFinish={finish} />);
 for(let i=0;i<4;i+=1)act(()=>jest.advanceTimersByTime(600));
 expect(screen.getByText('4 / 4')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'tour.skip'}));expect(finish).toHaveBeenCalledTimes(1);
});

test('Escape dismisses, keyboard navigation stays in the card, and focus returns on unmount', () => {
 addTargets();const launch=document.createElement('button');document.body.appendChild(launch);launch.focus();
 const finish=jest.fn();const view=render(<MomentumDashboardTour text={text} onFinish={finish} />);
 fireEvent.keyDown(document,{key:'Tab'});expect(screen.getByRole('button',{name:'tour.skip'})).toHaveFocus();
 fireEvent.keyDown(document,{key:'Tab',shiftKey:true});expect(screen.getByRole('button',{name:'tour.next'})).toHaveFocus();
 fireEvent.keyDown(document,{key:'Escape'});expect(finish).toHaveBeenCalledTimes(1);
 view.unmount();expect(launch).toHaveFocus();launch.remove();
});

test('fits narrow viewports and explains the active daily-change map', () => {
 addTargets();const original=window.innerWidth;window.innerWidth=320;
 try {
  const {container}=render(<MomentumDashboardTour text={text} onFinish={jest.fn()} metric="daily" />);
  fireEvent.click(screen.getByRole('button',{name:'tour.next'}));fireEvent.click(screen.getByRole('button',{name:'tour.next'}));
  expect(screen.getByText('tour.mapDaily.body')).toBeInTheDocument();
  expect(container.querySelector('.momentum-tour__card')).toHaveStyle({width:'292px'});
 } finally {window.innerWidth=original;}
});

test('uses a separate seen marker and tolerates unavailable browser storage', () => {
 window.localStorage.removeItem(TOUR_STORAGE_KEY);expect(hasSeenMomentumTour()).toBe(false);
 markMomentumTourSeen();expect(hasSeenMomentumTour()).toBe(true);
 expect(TOUR_STORAGE_KEY).not.toContain('priceAnalysis');
 const read=jest.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});
 const write=jest.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});
 expect(hasSeenMomentumTour()).toBe(true);expect(()=>markMomentumTourSeen()).not.toThrow();
 read.mockRestore();write.mockRestore();window.localStorage.removeItem(TOUR_STORAGE_KEY);
});
