const fs = require('fs');
const path = require('path');

describe('PriceAnalysis desktop tutorial placement', () => {
  it('positions the tutorial at the top-right of the intro without adding a row', () => {
    const css = fs.readFileSync(path.join(__dirname, '../PriceAnalysis.css'), 'utf8');
    const desktopRule = css.slice(css.lastIndexOf('@media (min-width: 769px)'));
    expect(desktopRule).toMatch(/\.pa-intro\s*\{[^}]*position:\s*relative\s*;/);
    expect(desktopRule).toMatch(/\.pa-tour-launch\s*\{[^}]*position:\s*absolute\s*;[^}]*top:\s*0\s*;[^}]*right:\s*0\s*;/);
    expect(desktopRule).toMatch(/\.pa-tour-launch\s*\{[^}]*margin-top:\s*0\s*;/);
    expect(desktopRule).toMatch(/\.pa-tour-launch\s*\{[^}]*border-color:\s*var\(--color-border-light,\s*#e1e7ef\)\s*;/);
  });
});
