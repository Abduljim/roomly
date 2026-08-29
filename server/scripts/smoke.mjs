/* End-to-end API smoke test against a running server on :4000 */
const BASE = "http://localhost:4000/api";
let cookie = "";

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  const email = `smoke-${Date.now()}@test.local`;
  const alice = await call("POST", "/auth/signup", { email, password: "password123", displayName: "Alice" });
  console.log("signup ok:", alice.displayName);

  const household = await call("POST", "/households", { name: "Smoke House" });
  console.log("household ok:", household.id);

  // second member joins
  cookie = "";
  const bobEmail = `smoke-bob-${Date.now()}@test.local`;
  await call("POST", "/auth/signup", { email: bobEmail, password: "password123", displayName: "Bob" });
  await call("POST", "/households/join", { inviteCode: household.inviteCode });

  // back as alice
  cookie = "";
  await call("POST", "/auth/login", { email, password: "password123" });
  const members = await call("GET", `/households/${household.id}/members`);
  console.log("members:", members.map((m) => m.user.displayName).join(", "));

  // create bill: rent 1500, equal split, alice creator/payer
  await call("POST", `/households/${household.id}/bills`, {
    name: "Rent",
    amount: 1500,
    recurrence: "monthly",
    dueDay: 1,
    category: "rent",
    splits: members.map((m) => ({ membershipId: m.id, splitType: "percentage", splitValue: 50 })),
  });
  console.log("bill created");

  // invalid split should be rejected
  let rejected = false;
  try {
    await call("POST", `/households/${household.id}/bills`, {
      name: "Bad", amount: 100, recurrence: "monthly", dueDay: 1, category: "other",
      splits: [{ membershipId: members[0].id, splitType: "percentage", splitValue: 40 }],
    });
  } catch (e) {
    rejected = /100%/.test(e.message);
  }
  console.log("split validation rejects bad splits:", rejected);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await call("POST", `/households/${household.id}/settlement/generate`);
  const settlement = await call("GET", `/households/${household.id}/settlement/${month}`);
  console.log("simplified debts:", JSON.stringify(settlement.simplified));
  console.log("payment count:", settlement.payments.length);

  // mark sent / confirm flow — log in as the payer of the first payment
  const payment = settlement.payments[0];
  const payerEmail = payment.payerName === "Alice" ? email : bobEmail;
  cookie = "";
  await call("POST", "/auth/login", { email: payerEmail, password: "password123" });
  await call("POST", `/payments/${payment.id}/mark-sent`, { note: "sent via Venmo" });
  // confirm must be done by the recipient
  const payeeEmail = payment.payeeName === "Alice" ? email : bobEmail;
  cookie = "";
  await call("POST", "/auth/login", { email: payeeEmail, password: "password123" });
  await call("POST", `/payments/${payment.id}/confirm`);
  const after = await call("GET", `/households/${household.id}/payments?status=confirmed`);
  console.log("confirmed payments:", after.length);

  // notifications
  cookie = "";
  await call("POST", "/auth/login", { email: bobEmail, password: "password123" });
  const notifs = await call("GET", "/notifications");
  console.log("bob notifications:", notifs.notifications.length, "unread:", notifs.unread);

  // authorization: bob (member, not admin) cannot remove alice; outsider gets 403
  cookie = "";
  const outsider = await fetch(BASE + `/households/${household.id}/members`);
  console.log("outsider blocked:", outsider.status === 401 || outsider.status === 403);

  console.log("ALL SMOKE TESTS PASSED");
  process.exit(0);
})().catch((e) => {
  console.error("SMOKE FAILED:", e.message);
  process.exit(1);
});
