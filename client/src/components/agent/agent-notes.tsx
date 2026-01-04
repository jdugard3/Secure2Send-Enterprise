import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, MessageSquare, AlertCircle, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface AgentNote {
  id: string;
  agentId: string;
  merchantId: string;
  noteText: string;
  isPriority: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentNotesProps {
  merchantId: string;
  notes: AgentNote[];
}

export default function AgentNotes({ merchantId, notes: initialNotes }: AgentNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<AgentNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isPriority, setIsPriority] = useState(false);

  const createNoteMutation = useMutation({
    mutationFn: async (data: { merchantId: string; noteText: string; isPriority: boolean }) => {
      const response = await apiRequest("POST", "/api/agent/notes", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Your note has been saved successfully.",
      });
      setNoteText("");
      setIsPriority(false);
      setShowAddNote(false);
      queryClient.invalidateQueries({ queryKey: ["/api/agent/merchants", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/notes", merchantId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (data: { noteId: string; noteText: string; isPriority: boolean }) => {
      const response = await apiRequest("PUT", `/api/agent/notes/${data.noteId}`, {
        noteText: data.noteText,
        isPriority: data.isPriority,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Updated",
        description: "Your note has been updated successfully.",
      });
      setNoteText("");
      setIsPriority(false);
      setEditingNote(null);
      queryClient.invalidateQueries({ queryKey: ["/api/agent/merchants", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/notes", merchantId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await apiRequest("DELETE", `/api/agent/notes/${noteId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Deleted",
        description: "Your note has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/merchants", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/notes", merchantId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete Note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (!noteText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a note.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate({
      merchantId,
      noteText: noteText.trim(),
      isPriority,
    });
  };

  const handleUpdateNote = () => {
    if (!editingNote || !noteText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a note.",
        variant: "destructive",
      });
      return;
    }

    updateNoteMutation.mutate({
      noteId: editingNote.id,
      noteText: noteText.trim(),
      isPriority,
    });
  };

  const handleEditClick = (note: AgentNote) => {
    setEditingNote(note);
    setNoteText(note.noteText);
    setIsPriority(note.isPriority);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Notes</CardTitle>
            <CardDescription>
              Internal notes for tracking merchant progress
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddNote(true)} size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {initialNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">No notes yet. Add your first note to track this merchant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 border rounded-lg ${
                  note.isPriority ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {note.isPriority && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Priority
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(note)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      disabled={deleteNoteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.noteText}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Note Dialog */}
      <Dialog open={showAddNote || !!editingNote} onOpenChange={(open) => {
        if (!open) {
          setShowAddNote(false);
          setEditingNote(null);
          setNoteText("");
          setIsPriority(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "Add Note"}</DialogTitle>
            <DialogDescription>
              {editingNote ? "Update your internal note for this merchant." : "Add an internal note to track this merchant's progress."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="noteText">Note</Label>
              <Textarea
                id="noteText"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={5}
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPriority"
                checked={isPriority}
                onCheckedChange={(checked) => setIsPriority(checked as boolean)}
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              />
              <label
                htmlFor="isPriority"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mark as priority (needs attention)
              </label>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddNote(false);
                setEditingNote(null);
                setNoteText("");
                setIsPriority(false);
              }}
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={editingNote ? handleUpdateNote : handleAddNote}
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            >
              {(createNoteMutation.isPending || updateNoteMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingNote ? "Update Note" : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

