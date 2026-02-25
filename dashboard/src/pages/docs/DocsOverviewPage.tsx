export default function DocsOverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Pesafy Documentation
      </h1>
      <p className="text-sm text-muted-foreground">
        Kenya-first payments for developers. Use Pesafy to integrate M-Pesa
        Daraja quickly using a Node/Express SDK and React components, with a
        production-ready dashboard on top.
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>
          Read the{" "}
          <strong className="text-foreground">Express SDK guide</strong> to wire
          Pesafy into your backend.
        </li>
        <li>
          Use the <strong className="text-foreground">React components</strong>{" "}
          to collect payment details in minutes.
        </li>
        <li>
          Follow the <strong className="text-foreground">M-Pesa Express</strong>{" "}
          docs to match Safaricom&apos;s Daraja flows exactly.
        </li>
      </ul>
    </div>
  );
}
