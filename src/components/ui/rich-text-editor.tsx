"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import {
   BoldIcon,
   ItalicIcon,
   ListIcon,
   ListOrderedIcon,
   StrikethroughIcon,
   BaselineIcon,
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { Toggle } from "@/src/components/ui/toggle"

const PRESET_COLORS = [
   "#000000", "#6b7280", "#ef4444", "#f97316",
   "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
]

interface RichTextEditorProps {
   value: string
   onChange: (html: string) => void
   placeholder?: string
   className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
   const [colorOpen, setColorOpen] = React.useState(false)
   const colorRef = React.useRef<HTMLDivElement>(null)

   const editor = useEditor({
      immediatelyRender: false,
      extensions: [
         StarterKit,
         TextStyle,
         Color,
         Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
      ],
      content: value,
      editorProps: {
         attributes: {
            class: "min-h-24 px-3 py-2 text-sm focus:outline-none",
         },
      },
      onUpdate({ editor }) {
         const html = editor.isEmpty ? "" : editor.getHTML()
         onChange(html)
      },
   })

   // Sync external value changes (e.g. cancel reset)
   const prevValue = React.useRef(value)
   React.useEffect(() => {
      if (!editor) return
      if (prevValue.current !== value && editor.getHTML() !== value) {
         editor.commands.setContent(value || "", false)
      }
      prevValue.current = value
   }, [value, editor])

   // Close color picker on outside click
   React.useEffect(() => {
      if (!colorOpen) return
      function handleOutside(e: MouseEvent) {
         if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
            setColorOpen(false)
         }
      }
      document.addEventListener("mousedown", handleOutside)
      return () => document.removeEventListener("mousedown", handleOutside)
   }, [colorOpen])

   const activeColor = editor?.getAttributes("textStyle").color as string | undefined

   return (
      <div className={cn("rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring", className)}>
         {/* Toolbar */}
         <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
            <Toggle
               size="sm"
               pressed={editor?.isActive("bold") ?? false}
               onPressedChange={() => editor?.chain().focus().toggleBold().run()}
               className="h-7 w-7 p-0"
            >
               <BoldIcon className="size-3.5" />
            </Toggle>
            <Toggle
               size="sm"
               pressed={editor?.isActive("italic") ?? false}
               onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
               className="h-7 w-7 p-0"
            >
               <ItalicIcon className="size-3.5" />
            </Toggle>
            <Toggle
               size="sm"
               pressed={editor?.isActive("strike") ?? false}
               onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
               className="h-7 w-7 p-0"
            >
               <StrikethroughIcon className="size-3.5" />
            </Toggle>
            <div className="mx-1 h-4 w-px bg-border" />
            <Toggle
               size="sm"
               pressed={editor?.isActive("bulletList") ?? false}
               onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
               className="h-7 w-7 p-0"
            >
               <ListIcon className="size-3.5" />
            </Toggle>
            <Toggle
               size="sm"
               pressed={editor?.isActive("orderedList") ?? false}
               onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
               className="h-7 w-7 p-0"
            >
               <ListOrderedIcon className="size-3.5" />
            </Toggle>
            <div className="mx-1 h-4 w-px bg-border" />

            {/* Color picker */}
            <div ref={colorRef} className="relative">
               <button
                  type="button"
                  onClick={() => setColorOpen((v) => !v)}
                  className={cn(
                     "flex h-7 w-7 flex-col items-center justify-center rounded-sm p-0 transition-colors hover:bg-muted",
                     colorOpen && "bg-muted",
                  )}
                  title="Font color"
               >
                  <BaselineIcon className="size-3.5" />
                  <div
                     className="h-0.5 w-3.5 rounded-full"
                     style={{ backgroundColor: activeColor ?? "#000000" }}
                  />
               </button>
               {colorOpen && (
                  <div className="absolute left-0 top-full z-30 mt-1 flex flex-col gap-2 rounded-lg border bg-popover p-2.5 shadow-md">
                     <div className="grid grid-cols-4 gap-1.5">
                        {PRESET_COLORS.map((color) => (
                           <button
                              key={color}
                              type="button"
                              title={color}
                              onClick={() => {
                                 editor?.chain().focus().setColor(color).run()
                                 setColorOpen(false)
                              }}
                              className={cn(
                                 "size-5 rounded-sm border border-black/10 transition-transform hover:scale-110",
                                 activeColor === color && "ring-2 ring-ring ring-offset-1",
                              )}
                              style={{ backgroundColor: color }}
                           />
                        ))}
                     </div>
                     <div className="flex items-center gap-1.5">
                        <input
                           type="color"
                           value={activeColor ?? "#000000"}
                           onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                           className="h-5 w-5 cursor-pointer rounded-sm border border-black/10 bg-transparent p-0"
                           title="Custom color"
                        />
                        <span className="text-xs text-muted-foreground">Custom</span>
                        {activeColor && (
                           <button
                              type="button"
                              onClick={() => {
                                 editor?.chain().focus().unsetColor().run()
                                 setColorOpen(false)
                              }}
                              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                           >
                              Reset
                           </button>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>
         <EditorContent editor={editor} />
      </div>
   )
}
