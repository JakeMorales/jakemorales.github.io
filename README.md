## Welcome to GitHub Pages

You can use the [editor on GitHub](https://github.com/JakeMorales/jakemorales.github.io/edit/main/README.md) to maintain and preview the content for your website in Markdown files.

Whenever you commit to this repository, GitHub Pages will run [Jekyll](https://jekyllrb.com/) to rebuild the pages in your site, from the content in your Markdown files.

### Markdown

Markdown is a lightweight and easy-to-use syntax for styling your writing. It includes conventions for

```markdown
Syntax highlighted code block

# Header 1
## Header 2
### Header 3

- Bulleted
- List

1. Numbered
2. List

**Bold** and _Italic_ and `Code` text

[Link](url) and ![Image](src)
```

For more details see [GitHub Flavored Markdown](https://guides.github.com/features/mastering-markdown/).

### Jekyll Themes

Your Pages site will use the layout and styles from the Jekyll theme you have selected in your [repository settings](https://github.com/JakeMorales/jakemorales.github.io/settings/pages). The name of this theme is saved in the Jekyll `_config.yml` configuration file.

### Support or Contact

Having trouble with Pages? Check out our [documentation](https://docs.github.com/categories/github-pages-basics/) or [contact support](https://support.github.com/contact) and we’ll help you sort it out.

## GitHub Pages Deployment

- **Auto-deploy:** I added a GitHub Actions workflow that publishes the repository root to GitHub Pages whenever you push to the `main` branch. The workflow file is at [.github/workflows/pages.yml](.github/workflows/pages.yml).
- **Why this helps:** You can keep the site as plain HTML/CSS (your current [index.html](index.html) will be served) or add a static site generator; the workflow will deploy the final built files.
- **Custom domain:** To use a custom domain, add a file named `CNAME` at the repo root containing your domain (e.g. `example.com`). Don't add it yet unless you want me to.

To push the current changes (create commit locally, then push):

```bash
git add .
git commit -m "Add Pages deployment workflow and docs"
git push origin main
```

After pushing, the workflow will run and publish the site. You can verify and manage Pages settings in the repository's Pages settings page on GitHub.

If you'd like, I can:
- Add a `CNAME` for a custom domain.
- Switch to a static site generator like Hugo/Eleventy and add a build step.
- Create a small template and replace the placeholder `COMING SOON` page.
