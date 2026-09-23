/** Public Amplify Gen 2 client config (Cognito + S3). Safe to ship to the browser. */
export const amplifyConfig = {
  auth: {
    user_pool_id: "us-east-1_Ct7xz39IV",
    aws_region: "us-east-1",
    user_pool_client_id: "58p23lr1o6cbm1lh0erhhcljq9",
    identity_pool_id: "us-east-1:8a87ced1-de13-494c-89da-58afc9c891ae",
    mfa_methods: [] as string[],
    standard_required_attributes: ["email"],
    username_attributes: ["email"],
    user_verification_types: ["email"],
    groups: [{ ADMIN: { precedence: 0 } }, { STAFF: { precedence: 1 } }, { CLIENT: { precedence: 2 } }],
    mfa_configuration: "NONE",
    password_policy: {
      min_length: 8,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: true,
      require_uppercase: true,
    },
    oauth: {
      identity_providers: ["GoogleWorkspace"],
      redirect_sign_in_uri: [
        "http://localhost:3000/login",
        "https://localhost:3000/login",
        "https://main.d1d1298kq4ckyb.amplifyapp.com/login",
      ],
      redirect_sign_out_uri: [
        "http://localhost:3000/login",
        "https://localhost:3000/login",
        "https://main.d1d1298kq4ckyb.amplifyapp.com/login",
      ],
      response_type: "code",
      scopes: ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"],
      domain: "691a0766fbb7a7116021.auth.us-east-1.amazoncognito.com",
    },
    unauthenticated_identities_enabled: true,
  },
  storage: {
    aws_region: "us-east-1",
    bucket_name: "amplify-valereportal-loga-valereportalcontractsbuc-w6xfkb02pcnl",
    buckets: [
      {
        name: "valerePortalContracts",
        bucket_name: "amplify-valereportal-loga-valereportalcontractsbuc-w6xfkb02pcnl",
        aws_region: "us-east-1",
      },
    ],
  },
  version: "1.3",
};
