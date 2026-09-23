/**
 * Google Workspace SAML IdP metadata for idpid C01pxyevi.
 * The embedded X.509 certificate is a public signing certificate, not a secret.
 * It expires on 2027-11-13 and must be rotated before then.
 */
export const googleWorkspaceSamlMetadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://accounts.google.com/o/saml2?idpid=C01pxyevi">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIIDdDCCAlygAwIBAgIGAYR1iMwqMA0GCSqGSIb3DQEBCwUAMHsxFDASBgNVBAoTC0dvb2dsZSBJbmMuMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MQ8wDQYDVQQDEwZHb29nbGUxGDAWBgNVBAsTD0dvb2dsZSBGb3IgV29yazELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWEwHhcNMjIxMTE0MDk0NjQ5WhcNMjcxMTEzMDk0NjQ5WjB7MRQwEgYDVQQKEwtHb29nbGUgSW5jLjEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEPMA0GA1UEAxMGR29vZ2xlMRgwFgYDVQQLEw9Hb29nbGUgRm9yIFdvcmsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1pSIG2AFJnUVec8lf4omNbrvPytb4C1ZDkbo2KDNYBqEwZQZAI0ng8/DxBoB1XSJqJpyyq4f6BrUgalcsxCLyqftQMi3YkmnfxhMuSBTpMjtRyKWKIYBAhl/2CEFfz8kLDw4MTg+WGYePgmukJ1FZDSTeamtdAaUX2Azb5CzhfXXu6O8vn+V90G5e6g1OUe0TmtQrDoXwMBKOI/E1BQpoTCNFoqwRyQvmpCuiQ2O7lwxJw3lr72zGDf2cUL2kUdoPTer8stJNVHrzkE74G2UgIIwSgShkQVpoGVQlVUA+ftv0eopUr0NYzhP8+PfWl/2bfOSPafANgTjkw0WzQtswIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQAjLL2gfCm+MeYwon5RsuICB+HRyHMicbjqAPr0ItDCunSr4dzFIN3pGwqVAa6gSQZpgxzq6xgdYwDe7wjzzGGAnwSEnMl3SVNLpyTvltJ1MwO6MfjQIti5+pCpbHXHJUE2jTVrPknYbJDl0k5k7PNVdxa/yl6N+5WEkvZsNLSXqclP+viniO5ZA3LTKM+VtvO43VMfLo1zKfxxLYbXZASY5ipPy0aYXdjFWqA9vf8FjLDReQZWECQ1IOg32pF1LvEEGEAXds8KhSNdWBWTiMA9oXk2VAj/3lMm7lCH8EfyTGe0Z4fEv6ofowgupKV/njJdXUZZKQvFwiEGn62WRjyX</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://accounts.google.com/o/saml2/idp?idpid=C01pxyevi"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://accounts.google.com/o/saml2/idp?idpid=C01pxyevi"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;
