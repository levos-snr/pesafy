/**
 * Encryption module types
 */

/**
 * Certificate source — can be the shorthand "sandbox" | "production"
 * (pesafy will resolve the bundled cert), or a raw PEM string.
 *
 * `(string & {})` keeps the named literals in IntelliSense autocomplete
 * while still accepting any arbitrary string, without triggering
 * the `no-redundant-type-constituents` ESLint rule.
 */
export type CertificateSource = "sandbox" | "production" | (string & {});
