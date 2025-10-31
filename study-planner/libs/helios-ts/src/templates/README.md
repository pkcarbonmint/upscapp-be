# Study Plan Template

This directory contains the Word template for template-based document generation.

## Template File

- **study-plan-template.docx** - The base Word template with docxtemplater placeholders

## How to Create the Template

The template file should be created using one of these methods:

### Method 1: Generate from Styled Template (Recommended)

1. Run the template generation script:
   ```bash
   pnpm run generate-template
   ```

2. This will create a base template with all necessary styles defined

3. Open the template in Microsoft Word and customize:
   - Modify colors, fonts, and formatting
   - Keep the existing structure and styles
   - Save the template

### Method 2: Manual Creation

1. Generate a sample document first:
   ```bash
   pnpm run generate-docs -s T1
   ```

2. Open the generated document in Microsoft Word

3. Replace content with docxtemplater placeholders:
   - Student name: `{coverPage.studentName}`
   - Target year: `{coverPage.year}`
   - Profile data: `{coverPage.profile.email}`, etc.

4. Save as template in this directory

## Template Placeholders

### Cover Page
- `{coverPage.title}` - Main title
- `{coverPage.year}` - Target year
- `{coverPage.studentName}` - Student name
- `{coverPage.profile.email}` - Student email
- `{coverPage.profile.phone}` - Student phone
- `{coverPage.profile.location}` - Location
- `{coverPage.profile.optionalSubject}` - Optional subject

### Birds Eye View
- `{#birdsEyeView.cycles}` - Loop through cycles
  - `{name}` - Cycle name
  - `{startDate}` - Cycle start date
  - `{endDate}` - Cycle end date
  - `{duration}` - Cycle duration
  - `{color}` - Background color
  - `{textColor}` - Text color

### Monthly Views
- `{#monthlyViews.months}` - Loop through months
  - `{name}` - Month name
  - `{year}` - Month year
  - `{cycleName}` - Associated cycle name
  - `{#calendarWeeks}` - Calendar weeks
    - `{#days}` - Days in week
      - `{dayNumber}` - Day number
      - `{#subjects}` - Subjects for the day

## Using the Template

Once the template is created, use it with the template service:

```bash
# Generate documents using template-based service
pnpm run generate-docs -s T1 --service template
```

## Customization Tips

1. **Colors**: Edit the cycle colors directly in the template
2. **Fonts**: Change the font family and sizes in Word
3. **Layout**: Adjust margins, spacing, and page setup
4. **Branding**: Replace company logo and contact information
5. **Styles**: Modify heading, paragraph, and table styles

## Template Structure

The template should maintain this structure:
1. Cover Page
2. Birds Eye View (Cycle Timeline)
3. Monthly Calendar Views
4. Weekly Schedule Views
5. Resources Table
6. Legend

## Notes

- The template must be a valid .docx file
- Placeholder syntax uses docxtemplater format
- Complex tables may require special handling
- Test the template after making changes
