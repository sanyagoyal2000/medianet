export function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[70vh] overflow-auto rounded-md bg-[#101828] p-3 text-[12px] leading-relaxed text-[#E4E7EC]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
