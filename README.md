# Portfolio Website

A personal portfolio website built with HTML and Tailwind CSS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```
This will watch for changes in your CSS files and automatically rebuild the styles.

3. Build for production:
```bash
npm run build
```
This will create a minified version of your CSS in the dist folder.

## Project Structure

```
portfolio/
├── src/              # Source files
├── dist/             # Build output directory
├── node_modules/     # Dependencies (ignored in version control)
├── .cursorignore     # Cursor IDE ignore rules
├── package.json      # Project configuration and dependencies
├── package-lock.json # Lock file for dependencies
└── README.md         # Project documentation
```

## Dependencies

- @tailwindcss/cli v4.1.4

## Features

- Responsive design
- Modern UI with Tailwind CSS
- Easy to customize and extend
- Development mode with live reload
- Production-ready minified builds

## Notes

- The `dist` and `node_modules` folders are ignored in version control
- Use `.cursorignore` for Cursor IDE specific rules
- Make sure to run `npm install` before starting development 