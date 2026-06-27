import { useEffect, useRef, useState } from "react";
import RichTextEditor from "react-rte";
import "react-rte/lib/Draft.global.css";
import "react-rte/lib/RichTextEditor.css";

type EditorValue = ReturnType<typeof RichTextEditor.createValueFromString>;

export default function RichTextHtmlEditor({ label, value, onChange }: { label: string; value?: string; onChange: (html: string) => void }) {
  const lastEmittedHtml = useRef(value ?? "");
  const [editorValue, setEditorValue] = useState<EditorValue>(() => RichTextEditor.createValueFromString(value ?? "", "html"));

  useEffect(() => {
    if ((value ?? "") === lastEmittedHtml.current) return;
    setEditorValue(RichTextEditor.createValueFromString(value ?? "", "html"));
  }, [value]);

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "rgba(0, 0, 0, 0.6)", marginBottom: 6 }}>{label}</label>
      <RichTextEditor
        value={editorValue}
        onChange={(nextValue: EditorValue) => {
          setEditorValue(nextValue);
          const html = nextValue.toString("html");
          lastEmittedHtml.current = html;
          onChange(html);
        }}
      />
    </div>
  );
}
