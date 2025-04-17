
# Styles and Components Guide

## Button Styles
```tsx
// Primary Button
<Button variant="default">
  Primary Action
</Button>

// Secondary Button
<Button variant="secondary">
  Secondary Action
</Button>

// Ghost Button
<Button variant="ghost">
  Subtle Action
</Button>
```

## Resource Card Styles
```tsx
<div className="relative rounded-lg border-2 p-4 transition-all hover:scale-105 hover:shadow-lg hover:border-primary">
  <h3 className="text-lg font-semibold">{resourceName}</h3>
  <span className="text-sm text-muted-foreground">{resourceId}</span>
</div>
```

## Status Indicators
```tsx
<span className={cn(
  "px-2 py-1 rounded-full text-xs font-medium",
  status === "Running" && "bg-green-100 text-green-800",
  status === "Stopped" && "bg-red-100 text-red-800"
)}>
  {status}
</span>
```

## Form Layout
```tsx
<div className="space-y-6">
  <div className="grid gap-4">
    <Label htmlFor="input">Label</Label>
    <Input id="input" />
  </div>
</div>
```

This documentation will help developers maintain consistency in styling and component usage throughout the application.

