export const adminApprovalTemplate = (user, approveLink, rejectLink) => `
<h3>New User Awaiting Approval</h3>
<p>Name: ${user.name}</p>
<p>Email: ${user.email}</p>
<p>Phone: ${user.phone}</p>

<a href="${approveLink}">Approve</a>
<a href="${rejectLink}">Reject</a>
`;
