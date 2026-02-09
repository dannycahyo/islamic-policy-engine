import Editor from "@monaco-editor/react";

export function DrlEditor({
  value,
  onChange,
  readOnly = false,
  height = "400px",
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <Editor
        height={height}
        defaultLanguage="java"
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 4,
          automaticLayout: true,
        }}
        theme="vs-dark"
      />
    </div>
  );
}
