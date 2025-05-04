import fs from 'fs';
import path from 'path';

describe('README.md', () => {
  const readmePath = path.join(__dirname, '../README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  it('should have the correct title: Firebase Studio', () => {
    expect(readmeContent).toContain('# Firebase Studio');
  });

  it('should describe a NextJS project', () => {
    expect(readmeContent).toContain('NextJS');
  });

  it('should mention Firebase', () => {
    expect(readmeContent).toContain('Firebase');
  });

  it('should mention src/app/page.tsx as an entry point', () => {
    expect(readmeContent).toContain('src/app/page.tsx');
  });
});