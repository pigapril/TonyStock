# EmotionTag Component

A dynamic, animated emotion tag component designed for displaying market sentiment indicators with visual feedback and interactive capabilities.

## Features

- **Dynamic Visual Indicators**: Animated pulse effects that vary based on sentiment intensity
- **Responsive Design**: Adapts to different screen sizes with appropriate scaling
- **Accessibility Support**: Full keyboard navigation and screen reader compatibility
- **Performance Optimized**: Uses CSS animations with hardware acceleration
- **Customizable**: Supports various sentiment types with distinct visual styles

## Usage

### Basic Usage

```jsx
import EmotionTag from '../Common/EmotionTag';

function MyComponent() {
  return (
    <EmotionTag
      sentimentType="fear"
      sentimentText="Fear"
      percentileValue={25}
    />
  );
}
```

### Interactive Usage

```jsx
import EmotionTag from '../Common/EmotionTag';

function InteractiveExample() {
  const handleTagClick = (sentimentType) => {
    console.log('Clicked sentiment:', sentimentType);
  };

  return (
    <EmotionTag
      sentimentType="greed"
      sentimentText="Greed"
      percentileValue={75}
      onTagClick={handleTagClick}
      showConnectionLine={true}
      animationDelay={200}
    />
  );
}
```

### Loading State

```jsx
<EmotionTag
  sentimentType="neutral"
  sentimentText="Loading..."
  percentileValue={null}
  isLoading={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sentimentType` | `string` | `'neutral'` | The type of sentiment. One of: `'extremeFear'`, `'fear'`, `'neutral'`, `'greed'`, `'extremeGreed'`, `'notAvailable'` |
| `sentimentText` | `string` | `''` | The text to display for the sentiment |
| `percentileValue` | `number \| null` | `null` | The percentile value (0-100) to display |
| `isActive` | `boolean` | `false` | Whether the tag is in an active state |
| `isLoading` | `boolean` | `false` | Whether the tag is in a loading state |
| `onTagClick` | `function` | `null` | Callback function when the tag is clicked. Receives `sentimentType` as parameter |
| `showConnectionLine` | `boolean` | `false` | Whether to show a connection line (typically for desktop layouts) |
| `animationDelay` | `number` | `0` | Animation delay in milliseconds |
| `className` | `string` | `''` | Additional CSS class names |

## Sentiment Types

### extremeFear
- **Color**: Deep Blue (#0000FF)
- **Intensity**: High
- **Animation**: Fast, intense pulse (2s)
- **Use Case**: Market panic, extreme overselling

### fear
- **Color**: Light Blue (#5B9BD5)
- **Intensity**: Medium
- **Animation**: Moderate pulse (2.5s)
- **Use Case**: Market uncertainty, cautious sentiment

### neutral
- **Color**: Gray (#708090)
- **Intensity**: Low
- **Animation**: Slow pulse (3s)
- **Use Case**: Balanced market conditions

### greed
- **Color**: Pink (#F0B8CE)
- **Intensity**: Medium
- **Animation**: Moderate pulse (2.5s)
- **Use Case**: Market optimism, risk-taking behavior

### extremeGreed
- **Color**: Deep Pink (#D24A93)
- **Intensity**: High
- **Animation**: Fast, intense pulse (2s)
- **Use Case**: Market euphoria, extreme overbuying

### notAvailable
- **Color**: Muted Gray (#6c757d)
- **Intensity**: None
- **Animation**: No pulse
- **Use Case**: When data is not available

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --emotion-tag-size: 12px;
  --emotion-tag-pulse-size: 16px;
  --emotion-tag-border-radius: 6px;
  --emotion-tag-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --emotion-tag-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --emotion-tag-shadow-hover: 0 4px 16px rgba(0, 0, 0, 0.15);
}
```

## Accessibility

- **Keyboard Navigation**: Supports Tab, Enter, and Space key interactions
- **Screen Readers**: Provides appropriate ARIA labels and roles
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- **Focus Management**: Clear focus indicators for keyboard users

## Performance

- **Hardware Acceleration**: Uses `transform` and `opacity` for animations
- **Efficient Rendering**: Minimal DOM manipulation and reflows
- **Memory Management**: Proper cleanup of event listeners and animations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Examples

### Market Sentiment Dashboard

```jsx
const sentiments = [
  { type: 'extremeFear', text: 'Extreme Fear', value: 10 },
  { type: 'fear', text: 'Fear', value: 30 },
  { type: 'neutral', text: 'Neutral', value: 50 },
  { type: 'greed', text: 'Greed', value: 70 },
  { type: 'extremeGreed', text: 'Extreme Greed', value: 90 }
];

function SentimentDashboard() {
  return (
    <div className="sentiment-dashboard">
      {sentiments.map((sentiment, index) => (
        <EmotionTag
          key={sentiment.type}
          sentimentType={sentiment.type}
          sentimentText={sentiment.text}
          percentileValue={sentiment.value}
          animationDelay={index * 100}
          onTagClick={(type) => console.log('Selected:', type)}
        />
      ))}
    </div>
  );
}
```

### Responsive Layout

```jsx
function ResponsiveEmotionTags() {
  return (
    <div className="emotion-tags-container">
      <EmotionTag
        sentimentType="fear"
        sentimentText="Fear"
        percentileValue={25}
        showConnectionLine={window.innerWidth >= 1024}
      />
    </div>
  );
}
```

## Integration with MarketSentimentIndex

The EmotionTag component is specifically designed to integrate with the MarketSentimentIndex component, replacing the static text-based sentiment indicators with dynamic, animated tags that better convey the changing nature of market sentiment data.

```jsx
// In MarketSentimentIndex.js
import EmotionTag from '../Common/EmotionTag';

// Replace static span with EmotionTag
<EmotionTag
  sentimentType={raw}
  sentimentText={t(sentimentKey)}
  percentileValue={ind.percentileRank}
  isLoading={loading}
  onTagClick={() => setSelectedIndicatorKey(key)}
  animationDelay={index * 100}
  className="composition-emotion-tag"
/>
```