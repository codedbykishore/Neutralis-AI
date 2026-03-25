# IEEE Conference Paper: LaTeX Column Formatting Guide

When working with the IEEE LaTeX template (`IEEEtran`), switching between a double-column (final publication) and single-column (draft/review) layout is usually handled entirely in the `\documentclass` declaration on the very first line of your document.

## 1. Double Column Format (Standard IEEE Default)
By default, the IEEE conference template uses a two-column layout. If you need to revert to the standard format or ensure your document is set up correctly for final submission, use the standard conference options.

**The LaTeX Code:**
```latex
\documentclass[10pt, conference]{IEEEtran}
```

## 2. Single Column Format (Review or Single-Page Draft)
There are two common ways to format an IEEE paper into a single column, depending on whether you want a readable draft or just a standard layout squeezed into one column.

### Option A: Standard Single Column Draft (Recommended for Review)
This is the most common way to create a single-column version. It increases the font size to 12pt and adds spacing, making it much easier for peers or advisors to read and review.

**The LaTeX Code:**
```latex
\documentclass[12pt, draftclsnofoot, onecolumn]{IEEEtran}
```

### Option B: Final Look (Just Single Column)
If you want the exact formatting, fonts, and spacing of the final paper, but just forced into a single column, you simply add the `onecolumn` flag to the standard conference setup.

**The LaTeX Code:**
```latex
\documentclass[10pt, conference, onecolumn]{IEEEtran}
```

---

## ⚠️ Troubleshooting: Figures and Tables
When you switch a document from double-column to single-column, your images and tables might suddenly disappear, float to the end of the document, or cause compilation errors. 

**Here is how to fix it:**
* **For Figures:** Look for `\begin{figure*}` in your code. The asterisk (`*`) tells LaTeX to span the image across two columns. Change `\begin{figure*}` and `\end{figure*}` to simply `\begin{figure}` and `\end{figure}`.
* **For Tables:** Do the exact same thing. Change `\begin{table*}` and `\end{table*}` to `\begin{table}` and `\end{table}`.
