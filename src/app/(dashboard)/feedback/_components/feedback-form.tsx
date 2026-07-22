"use client"

import * as React from "react"
import { toast } from "sonner"
import { MessageSquareIcon, LightbulbIcon, TriangleAlertIcon, CheckIcon, SendIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Textarea } from "@/src/components/ui/textarea"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
} from "@/src/components/ui/dialog"
import { cn } from "@/src/lib/utils"
import { submitFeedback, type FeedbackCategory } from "../_actions"

const MESSAGE_MAX = 1000

const CATEGORIES: {
   key: FeedbackCategory
   label: string
   description: string
   icon: React.ElementType
   iconClass: string
}[] = [
   {
      key: "feedback",
      label: "Feedback",
      description: "Share your experience and help us improve.",
      icon: MessageSquareIcon,
      iconClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
   },
   {
      key: "suggestion",
      label: "Suggestion",
      description: "Share your ideas to make our service better.",
      icon: LightbulbIcon,
      iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
   },
   {
      key: "complaint",
      label: "Issue",
      description: "Report an issue or problem you've encountered.",
      icon: TriangleAlertIcon,
      iconClass: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
   },
]

export function FeedbackForm() {
   const [category, setCategory] = React.useState<FeedbackCategory>("feedback")
   const [subject, setSubject] = React.useState("")
   const [message, setMessage] = React.useState("")
   const [isPending, startTransition] = React.useTransition()
   const [showThanks, setShowThanks] = React.useState(false)

   const isComplaint = category === "complaint"

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      const trimmed = message.trim()
      if (trimmed.length < 5) {
         toast.error("Please add a little more detail before submitting.")
         return
      }
      if (isComplaint && subject.trim().length === 0) {
         toast.error("Please add a subject for your issue.")
         return
      }
      startTransition(async () => {
         const result = await submitFeedback({
            category,
            subject: isComplaint ? subject.trim() : undefined,
            message: trimmed,
         })
         if (result.success) {
            setShowThanks(true)
            setSubject("")
            setMessage("")
         } else {
            toast.error(result.message)
         }
      })
   }

   return (
      <>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
         {/* ── Left: category picker ── */}
         <Card>
            <CardHeader>
               <CardTitle className="text-base">Help Us Improve</CardTitle>
               <CardDescription>Pick what best describes your message.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
               {CATEGORIES.map(({ key, label, description, icon: Icon, iconClass }) => {
                  const selected = category === key
                  return (
                     <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        aria-pressed={selected}
                        className={cn(
                           "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                           selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30 hover:bg-muted/40",
                        )}
                     >
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", iconClass)}>
                           <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                           <span className="block text-sm font-semibold">{label}</span>
                           <span className="block text-xs text-muted-foreground">{description}</span>
                        </span>
                        <span
                           className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                              selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                           )}
                           aria-hidden="true"
                        >
                           {selected && <CheckIcon className="size-3.5" />}
                        </span>
                     </button>
                  )
               })}
            </CardContent>
         </Card>

         {/* ── Right: detail ── */}
         <Card>
            <CardHeader>
               <CardTitle className="text-base">Detail</CardTitle>
               <CardDescription>
                  {isComplaint
                     ? "Give your issue a subject and describe what went wrong."
                     : "Tell us more so we can act on it."}
               </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
               {/* Subject - complaints only */}
               {isComplaint && (
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="feedback-subject">
                        Subject <span className="text-destructive">*</span>
                     </Label>
                     <Input
                        id="feedback-subject"
                        placeholder="Brief summary of the issue"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        maxLength={150}
                        required
                     />
                  </div>
               )}

               <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                     <Label htmlFor="feedback-message">Message</Label>
                     <span className="text-xs tabular-nums text-muted-foreground">
                        {message.length}/{MESSAGE_MAX}
                     </span>
                  </div>
                  <Textarea
                     id="feedback-message"
                     placeholder="Please provide detail about your feedback…"
                     value={message}
                     onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                     rows={15}
                     className="resize-none"
                     required
                  />
               </div>

               <Button type="submit" disabled={isPending} className="h-11 w-full">
                  {isPending ? (
                     <>
                        Sending…
                        <Spinner className="ml-1" />
                     </>
                  ) : (
                     <>
                        <SendIcon className="size-4" />
                        Submit
                     </>
                  )}
               </Button>

            </CardContent>
         </Card>
      </form>

      {/* ── Thank-you modal ── */}
      <Dialog open={showThanks} onOpenChange={setShowThanks}>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader className="items-center text-center sm:text-center">
               <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100/70 ring-4 ring-emerald-100/40 dark:bg-emerald-950/40 dark:ring-emerald-950/30">
                  <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                     <CheckIcon className="size-6 text-white" strokeWidth={3} />
                  </div>
               </div>
               <DialogTitle className="mt-2 text-xl">Thank You!</DialogTitle>
               <DialogDescription>
                  We appreciate you taking the time to help us improve. Your message has been sent to our team.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button className="w-full" onClick={() => setShowThanks(false)}>
                  Done
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
      </>
   )
}
