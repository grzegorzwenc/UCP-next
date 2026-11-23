"use client";
import { NameDialog } from "@/components/ui/NameDialog";

/**
 * The one New folder dialog, used by Pages, Assets and Content entities.
 *
 * The three had drifted apart: pages built its own on `ModalShell`, assets had a hand-rolled
 * overlay with a rounded panel and no header band, and entities used `NameDialog` at a different
 * width — three dialogs for one job, each a little different. This fixes the title, the field
 * label, the button and the width in one place; a section supplies only what is genuinely its
 * own, which is where the folder goes and how its path reads.
 *
 * `where` is the destination control. Give it the pages `LocationSelect` wherever there is a
 * choice to make, so the trigger and its popup look the same everywhere, or plain text where
 * there is only one possible destination.
 */
export function NewFolderDialog({ subtitle, where, preview, placeholder, onClose, onSubmit }: {
  /** One line under the title saying what the folder is for. */
  subtitle?: React.ReactNode;
  /** The destination: a `LocationSelect` where there is a choice, else text. */
  where?: React.ReactNode;
  /** The path the folder will take, shown live under the field. */
  preview?: (name: string) => React.ReactNode;
  placeholder?: string;
  onClose: () => void;
  /** Throw to show the message in the dialog and keep it open. */
  onSubmit: (name: string) => Promise<void>;
}) {
  return (
    <NameDialog
      title="New folder"
      subtitle={subtitle}
      label="Folder name"
      action="Create folder"
      placeholder={placeholder}
      where={where}
      preview={preview}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
