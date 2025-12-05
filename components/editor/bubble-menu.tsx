'use client'

import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
} from 'lucide-react'
import { ToolbarButton } from './toolbar-button'

interface EditorBubbleMenuProps {
  editor: Editor | null
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  // Must check editor.view exists and is editable to prevent "domFromPos" error
  // This error occurs when BubbleMenu renders before the editor view is fully mounted
  if (!editor?.view?.dom) return null

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-lg"
    >
      <ToolbarButton
        icon={Bold}
        tooltip="Bold (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        tooltip="Italic (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={UnderlineIcon}
        tooltip="Underline (Ctrl+U)"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        tooltip="Strikethrough (Ctrl+Shift+S)"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
      />
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        icon={Code}
        tooltip="Inline Code (Ctrl+E)"
        isActive={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
      />
      <ToolbarButton
        icon={Highlighter}
        tooltip="Highlight (Ctrl+Shift+H)"
        isActive={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        disabled={!editor.can().chain().focus().toggleHighlight().run()}
      />
    </BubbleMenu>
  )
}
