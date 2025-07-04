import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CarrierQuoteNotesForm } from "./CircuitQuotes/CarrierQuoteNotes/CarrierQuoteNotesForm";
import { CarrierQuoteNotesList } from "./CircuitQuotes/CarrierQuoteNotes/CarrierQuoteNotesList";

interface NoteEntry {
  id: string;
  date: string;
  note: string;
  files: NoteFile[];
  user_name: string;
}

interface NoteFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

interface CarrierQuoteNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrierId: string;
  carrierName: string;
  initialNotes?: string;
  onNotesUpdate?: (notes: string) => void;
}

export const CarrierQuoteNotesDialog = ({ 
  open, 
  onOpenChange, 
  carrierId, 
  carrierName, 
  initialNotes = "",
  onNotesUpdate 
}: CarrierQuoteNotesDialogProps) => {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Load existing notes when dialog opens
  useEffect(() => {
    if (open && carrierId) {
      loadNotes();
    }
  }, [open, carrierId]);

  // Initialize with existing notes if they exist
  useEffect(() => {
    if (open && initialNotes && notes.length === 0) {
      const initialEntry: NoteEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        note: initialNotes,
        files: [],
        user_name: 'Unknown User'
      };
      setNotes([initialEntry]);
    }
  }, [open, initialNotes, notes.length]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('carrier_quote_notes')
        .select(`
          *,
          carrier_quote_note_files (*)
        `)
        .eq('carrier_quote_id', carrierId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for the notes
      const userIds = [...new Set(data?.map(note => note.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      const formattedNotes: NoteEntry[] = (data || []).map(note => ({
        id: note.id,
        date: note.created_at,
        note: note.content,
        user_name: profilesMap.get(note.user_id) || 'Unknown User',
        files: (note.carrier_quote_note_files || []).map((file: any) => ({
          id: file.id,
          name: file.file_name,
          type: file.file_type,
          url: file.file_path,
          size: file.file_size || 0
        }))
      }));

      setNotes(formattedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const uploadFile = async (file: File, noteId: string): Promise<NoteFile | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `carrier-quote-notes/${carrierId}/${fileName}`;

      console.log('Uploading file to path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('carrier-quote-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('carrier-quote-files')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', urlData.publicUrl);

      const { data: fileData, error: fileError } = await supabase
        .from('carrier_quote_note_files')
        .insert({
          carrier_quote_note_id: noteId,
          file_name: file.name,
          file_type: file.type,
          file_path: urlData.publicUrl,
          file_size: file.size
        })
        .select()
        .single();

      if (fileError) {
        console.error('File record error:', fileError);
        throw fileError;
      }

      return {
        id: fileData.id,
        name: file.name,
        type: file.type,
        url: urlData.publicUrl,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const saveNote = async () => {
    if (!newNote.trim() && uploadingFiles.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('carrier_quote_notes')
        .insert({
          carrier_quote_id: carrierId,
          content: newNote.trim() || "File upload",
          user_id: user?.id
        })
        .select()
        .single();

      if (noteError) throw noteError;

      const uploadedFiles: NoteFile[] = [];
      for (const file of uploadingFiles) {
        const uploadedFile = await uploadFile(file, noteData.id);
        if (uploadedFile) {
          uploadedFiles.push(uploadedFile);
        }
      }

      await loadNotes();
      
      setNewNote("");
      setUploadingFiles([]);

      toast({
        title: "Note saved",
        description: "Your note has been saved successfully"
      });

      const allNotesText = notes
        .map(note => `${note.date}: ${note.note}`)
        .join('\n\n');
      
      if (onNotesUpdate) {
        onNotesUpdate(allNotesText);
      }

    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('carrier_quote_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      await loadNotes();
      
      toast({
        title: "Note deleted",
        description: "Note has been deleted successfully"
      });

      setTimeout(() => {
        const allNotesText = notes
          .filter(note => note.id !== noteId)
          .map(note => `${note.date}: ${note.note}`)
          .join('\n\n');
        
        if (onNotesUpdate) {
          onNotesUpdate(allNotesText);
        }
      }, 100);

    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] max-w-2xl ml-auto">
        <DrawerHeader className="flex items-center justify-between border-b">
          <DrawerTitle>Notes for {carrierName}</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <CarrierQuoteNotesForm
            newNote={newNote}
            setNewNote={setNewNote}
            uploadingFiles={uploadingFiles}
            setUploadingFiles={setUploadingFiles}
            loading={loading}
            onSaveNote={saveNote}
          />

          <CarrierQuoteNotesList
            notes={notes}
            onDeleteNote={deleteNote}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
