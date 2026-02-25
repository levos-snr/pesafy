export default function MpesaExpressDocsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">
        M-Pesa Express · Safaricom Daraja
      </h1>
      <p className="text-sm text-muted-foreground">
        Pesafy follows Safaricom&apos;s official Daraja documentation for
        Authorization, M-Pesa Express (STK Push), STK Query and C2B Simulate.
        The request and response fields map 1:1 to the docs you see in the
        Daraja Developers&apos; Portal.
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>
          OAuth token:{" "}
          <code>GET /oauth/v1/generate?grant_type=client_credentials</code>{" "}
          using Basic auth (<code>consumerKey:consumerSecret</code>).
        </li>
        <li>
          STK Push: <code>POST /mpesa/stkpush/v1/processrequest</code> with{" "}
          <code>BusinessShortCode</code>, <code>Password</code>,{" "}
          <code>Timestamp</code>, <code>Amount</code>, <code>PartyA</code>,{" "}
          <code>PartyB</code>, <code>PhoneNumber</code>,{" "}
          <code>CallBackURL</code>, <code>AccountReference</code>,{" "}
          <code>TransactionDesc</code>.
        </li>
        <li>
          STK Query: <code>POST /mpesa/stkpushquery/v1/query</code> with{" "}
          <code>BusinessShortCode</code>, <code>Password</code>,{" "}
          <code>Timestamp</code>, <code>CheckoutRequestID</code>.
        </li>
        <li>
          C2B Simulate: <code>POST /mpesa/c2b/v1/simulate</code> and{" "}
          <code>/mpesa/c2b/v1/registerurl</code> for sandbox testing.
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        See the Safaricom documentation you provided in this repo for the
        canonical field descriptions and error codes; Pesafy mirrors those
        contracts so you never have to fight mismatched payloads.
      </p>
    </div>
  );
}
