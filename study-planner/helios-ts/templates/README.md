# Calendar Template Documentation

This directory contains JSON template configuration files for the TemplateCalendarDocxService.

## Template System

The template-based service uses JSON configuration files to define styles, colors, fonts, and other document properties. This allows for complete customization of document appearance without modifying code.

## Template Structure

Templates are JSON files that define:
- **Colors**: Color palette for different elements
- **Fonts**: Font families for different text types  
- **Styles**: Text formatting (size, bold, italics, color)
- **Spacing**: Margins, padding, and spacing values
- **Cycle Colors**: Background colors for different study cycles
- **Metadata**: Document properties and information

## Creating Custom Templates

Create a JSON file with the following structure:

```json
{
  "templateName": "My Custom Template",
  "version": "1.0.0",
  "description": "Custom template description",
  
  "colors": {
    "primary": "2E5BBA",
    "secondary": "666666", 
    "text": "333333",
    "border": "E0E0E0"
  },
  
  "fonts": {
    "primary": "Aptos",
    "secondary": "Calibri"
  },
  
  "styles": {
    "documentTitle": {
      "size": 42,
      "bold": true,
      "color": "primary",
      "font": "primary"
    },
    "studentName": {
      "size": 36,
      "bold": true,
      "color": "text",
      "font": "primary"
    }
    // ... more styles
  },
  
  "cycleColors": {
    "C1": "E3F2FD",
    "C2": "E8F5E8",
    // ... more cycle colors
  }
}
```

## Available Style Properties

Each style in the `styles` object can have:
- **size**: Font size in points
- **bold**: true/false for bold text
- **italics**: true/false for italic text
- **color**: Color key from the colors object or hex color
- **font**: Font key from the fonts object

## Available Styles

### Cover Page Styles
- `documentTitle`: Main document title
- `studentName`: Student name display
- `documentSubtitle`: Document subtitle
- `sectionHeading`: Section headers
- `quote`: Inspirational quotes
- `quoteAuthor`: Quote attribution
- `coverFooter`: Footer text
- `generationDate`: Generation timestamp

### Main Content Styles
- `mainHeading`: Primary headings
- `subHeading`: Secondary headings
- `monthTitle`: Month page titles
- `cycleName`: Study cycle names
- `tableHeader`: Table header cells
- `tableCell`: Regular table cells

### Calendar Styles
- `calendarCycleName`: Cycle names in calendar
- `calendarMonthName`: Month names in calendar
- `calendarDayHeader`: Day of week headers
- `calendarDay`: Individual calendar days
- `calendarDayNumber`: Day numbers in monthly view
- `calendarSubject`: Subject names in calendar

### Resource Styles
- `subjectCardTitle`: Subject card headers
- `resourceCategoryTitle`: Resource category labels
- `resourceItem`: Individual resource items
- `noResourcesMessage`: No resources message

## Usage Examples

### Using Default Template
```typescript
import { TemplateCalendarDocxService } from './services/TemplateCalendarDocxService';

// Uses calendar-template.json automatically
await TemplateCalendarDocxService.generateStudyPlanDocx(
  studyPlan, 
  studentIntake, 
  { filename: 'study-plan.docx' }
);
```

### Using Custom Template
```typescript
import { TemplateCalendarDocxService } from './services/TemplateCalendarDocxService';

// Set custom template
TemplateCalendarDocxService.setTemplatePath('./my-custom-template.json');

// Generate with custom styling
await TemplateCalendarDocxService.generateStudyPlanDocx(
  studyPlan, 
  studentIntake, 
  { filename: 'custom-styled-plan.docx' }
);
```

### Template Files Included

1. **`calendar-template.json`** - Default professional template
2. **`custom-template.json`** - Example custom template with different styling

## Template Validation

The system automatically:
- Validates JSON syntax
- Falls back to defaults for missing properties
- Provides console logging for template loading status
- Handles missing template files gracefully

## Color Palette

The template uses the following color scheme:
- **Primary Blue**: #2E5BBA
- **Text Dark**: #333333
- **Text Medium**: #666666
- **Border Gray**: #E0E0E0

## Cycle Colors

The following background colors are used for different cycle types:
- **C1**: #E3F2FD (Very light blue)
- **C2**: #E8F5E8 (Very light green)
- **C3**: #FCE4EC (Very light pink)
- **C4**: #FFEBEE (Very light red)
- **C5/C5B**: #F3E5F5 (Very light purple)
- **C6**: #E1F5FE (Very light cyan)
- **C7**: #FFF3E0 (Very light orange)
- **C8**: #F1F8E9 (Very light lime)

## Benefits

- **True Template System**: Actually loads and uses external template files
- **JSON Configuration**: Easy to edit and version control
- **Separation of Concerns**: Complete separation of content and styling
- **Easy Customization**: Change appearance by editing JSON files
- **Professional Look**: Consistent styling throughout documents
- **Maintainability**: Centralized style definitions
- **Flexibility**: Multiple templates for different use cases
- **Fallback System**: Graceful handling of missing templates

## Advanced Features

- **Color References**: Use color names that reference the color palette
- **Font References**: Use font names that reference the font definitions
- **Automatic Path Resolution**: Finds templates in multiple possible locations
- **Runtime Template Switching**: Change templates programmatically
- **Comprehensive Logging**: Track template loading and usage

## Testing

The template system has been thoroughly tested with:
- ✅ Default template loading
- ✅ Custom template loading  
- ✅ Missing template fallback
- ✅ Invalid JSON handling
- ✅ Runtime template switching
- ✅ Document generation with different styles