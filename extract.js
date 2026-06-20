const fs = require('fs');

function extractComponent(componentPath, name) {
  let content = fs.readFileSync(componentPath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  const tStart = content.indexOf('  template: `\n');
  const sStart = content.indexOf('\n  `,\n  styles: [`\n');
  const sEnd = content.indexOf('\n  `]\n})');

  if (tStart === -1) {
    console.log(name, 'already extracted or template not found.');
    return;
  }
  
  // What if styles are not present?
  let template, styles, newContent;
  
  if (sStart !== -1 && sEnd !== -1) {
    template = content.substring(tStart + 14, sStart);
    styles = content.substring(sStart + 16, sEnd);
    
    fs.writeFileSync(componentPath.replace('.ts', '.html'), template);
    fs.writeFileSync(componentPath.replace('.ts', '.css'), styles);
    
    newContent = content.substring(0, tStart) + '  templateUrl: \'./' + name + '.component.html\',\n  styleUrls: [\'./' + name + '.component.css\']\n})' + content.substring(sEnd + 8);
  } else {
    // Just template
    const tEnd = content.indexOf('\n  `\n})');
    if (tEnd !== -1) {
      template = content.substring(tStart + 14, tEnd);
      fs.writeFileSync(componentPath.replace('.ts', '.html'), template);
      newContent = content.substring(0, tStart) + '  templateUrl: \'./' + name + '.component.html\'\n})' + content.substring(tEnd + 6);
    } else {
      console.log('Failed to find end of template for', name);
      return;
    }
  }

  fs.writeFileSync(componentPath, newContent);
  console.log(name, 'extracted successfully');
}

extractComponent('src/app/features/expenses/expenses.component.ts', 'expenses');
extractComponent('src/app/features/daily-entries/daily-entries.component.ts', 'daily-entries');
