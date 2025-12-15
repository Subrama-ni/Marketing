export const verifyEmailTemplate = (name, link) => `
<h2>Welcome ${name}</h2>
<p>Please verify your email:</p>
<a href="${link}">Verify Email</a>
`;
