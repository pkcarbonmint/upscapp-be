# Calendar Template Documentation

This directory contains Word document templates for the TemplateCalendarDocxService.

## Template Structure

The template-based service uses predefined styles instead of inline formatting. This allows for easier customization of the document appearance without modifying code.

## Creating the Template

To create a Word template with the required styles:

1. **Open Microsoft Word**
2. **Create a new blank document**
3. **Define the following styles** (Format > Styles > Manage Styles):

### Cover Page Styles
- **DocumentTitle**: Font: Aptos, Size: 42pt, Bold, Color: #2E5BBA
- **StudentName**: Font: Aptos, Size: 36pt, Bold, Color: #333333
- **DocumentSubtitle**: Font: Aptos, Size: 18pt, Color: #666666
- **SectionHeading**: Font: Aptos, Size: 24pt, Bold, Color: #2E5BBA
- **Quote**: Font: Aptos, Size: 18pt, Italic, Color: #2E5BBA
- **QuoteAuthor**: Font: Aptos, Size: 14pt, Color: #666666
- **CoverFooter**: Font: Aptos, Size: 14pt, Color: #666666
- **GenerationDate**: Font: Aptos, Size: 12pt, Color: #666666

### Main Content Styles
- **MainHeading**: Font: Aptos, Size: 28pt, Bold, Color: #2E5BBA
- **SubHeading**: Font: Aptos, Size: 24pt, Bold, Color: #2E5BBA
- **MonthTitle**: Font: Aptos, Size: 28pt, Bold, Color: #2E5BBA
- **CycleName**: Font: Aptos, Size: 25pt, Bold, Color: #2E5BBA

### Calendar Styles
- **CalendarCycleName**: Font: Aptos, Size: 10pt, Bold, Color: #2E5BBA
- **CalendarMonthName**: Font: Aptos, Size: 12pt, Bold, Color: #333333
- **CalendarDayHeader**: Font: Aptos, Size: 8pt, Bold, Color: #666666
- **CalendarDay**: Font: Aptos, Size: 8pt, Color: #333333
- **MonthlyCalendarHeader**: Font: Aptos, Size: 12pt, Bold, Color: #2E5BBA
- **CalendarDayNumber**: Font: Aptos, Size: 14pt, Bold, Color: #333333
- **CalendarSubject**: Font: Aptos, Size: 8pt, Color: #333333

### Info and Strategy Styles
- **InfoIcon**: Font: Aptos, Size: 16pt, Color: #2E5BBA
- **InfoLabel**: Font: Aptos, Size: 14pt, Bold, Color: #666666
- **InfoValue**: Font: Aptos, Size: 14pt, Color: #333333
- **StrategyIcon**: Font: Aptos, Size: 20pt, Color: #2E5BBA
- **StrategyTitle**: Font: Aptos, Size: 12pt, Bold, Color: #666666
- **StrategyValue**: Font: Aptos, Size: 14pt, Color: #333333

### Resource Styles
- **SubjectCardTitle**: Font: Aptos, Size: 14pt, Bold, Color: #2E5BBA
- **ResourceCategoryTitle**: Font: Aptos, Size: 10pt, Bold, Color: #666666
- **ResourceItem**: Font: Aptos, Size: 9pt, Color: #333333
- **NoResourcesMessage**: Font: Aptos, Size: 14pt, Italic, Color: #666666

### Table Styles
- **TableHeader**: Font: Aptos, Size: 20pt, Bold, Color: #2E5BBA
- **TableCell**: Font: Aptos, Size: 20pt, Color: #333333

## Table Styles

Create the following table styles:

### InfoCard
- Borders: All sides, 1pt, Color: #E0E0E0
- No inside vertical borders

### StrategyGrid
- No borders

### CalendarGrid
- Borders: All sides and inside, 1pt, Color: #E0E0E0

### ResourcesTable
- Borders: All sides and inside, 1pt, Color: #E0E0E0

### LegendTable
- Borders: All sides and inside, 1pt, Color: #E0E0E0

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

## Usage

1. Save the template as `calendar-template.docx` in this directory
2. The TemplateCalendarDocxService will use these styles automatically
3. To customize appearance, modify the template file instead of the code

## Benefits

- **Separation of Concerns**: Content generation is separate from styling
- **Easy Customization**: Change appearance without touching code
- **Professional Look**: Consistent styling throughout the document
- **Maintainability**: Styles are centralized in the template
- **Flexibility**: Different templates can be used for different purposes

## Note

The current implementation works without a template file by using inline styles that match the template specification. The template file is optional but recommended for maximum flexibility.