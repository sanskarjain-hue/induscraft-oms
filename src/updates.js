// What changed, in plain words, one log per audience. Newest entry first.
// To announce something new: add an entry at the top of the right list(s) with a new id
// (the id is what decides whether the "What's new" dot shows again). Keep sentences short.
// Roles with no list here (qc, accountant) simply don't see a What's new button.

const SALES = [
  {
    id: "2026-11-26-review",
    date: "26 Nov 2026",
    title: "Orders under review",
    items: [
      { icon: "ti-flag", title: "Under review", text: "Sometimes the office wants a second look at an order before its commission is paid. That order shows an Under review tag on My Sales. It still counts toward your sales and your slab, and nothing about your rate changes. Its commission is paid once the check is done." },
    ],
  },
  {
    id: "2026-11-26",
    date: "26 Nov 2026",
    title: "Your sales tools",
    items: [
      { icon: "ti-trophy", title: "My Sales: your commission meter", text: "This is where you land after signing in. It shows the commission you've earned this month, how much more you need to reach the next slab, and what a deal in negotiation would add if it closes. Slabs are 1% from ₹7.15L, 1.5% from ₹10L and 2% from ₹15.75L of your monthly sales, and the rate applies to everything you sold that month. Only you can see your numbers." },
      { icon: "ti-circle-check", title: "Earned and waiting", text: "Commission turns from waiting to earned when every item on an order is delivered. Bangalore, Pune, Jodhpur and Website orders count. Wholesale doesn't. It's paid after the month ends, and once the office records it you'll see \"paid\" on your meter." },
      { icon: "ti-walk", title: "Visits: log who walked in", text: "Log a showroom visitor in a few taps: what they looked at and how keen they were. A name and number are optional. If someone is serious, add them to your pipeline in one tap. Website enquiries have their own tab." },
      { icon: "ti-list-check", title: "Pipeline opens on Today", text: "Today lists the deals you should follow up now, biggest first. After a call, tap Called ✓ and choose Tomorrow, 3 days or 1 week, or choose Lost and give the reason. Deals that have gone quiet for a long time sit under Older so the list stays short." },
      { icon: "ti-phone", title: "Small things", text: "Phone numbers on Today are tap to call. Each deal shows where the lead came from. A strip at the top of Pipeline shows your commission and how far you are from the next slab. Tap it to open My Sales." },
    ],
  },
];

const ADMIN = [
  {
    id: "2026-11-26-review",
    date: "26 Nov 2026",
    title: "Review the orders behind each commission",
    items: [
      { icon: "ti-list-search", title: "Click a salesperson to see their orders", text: "On My Sales, Overview and Payouts, click anyone's name to see every order they earn commission from this month: the customer, order value, commission, and whether it's waiting on delivery, ready to pay, on hold or paid. Use the month stepper first to look at another month." },
      { icon: "ti-flag", title: "Flag an order", text: "If something looks wrong, press Flag for review and give a short reason. A flagged order still counts toward the person's sales and slab, but its commission is held out of payouts until you clear the flag. The person sees an Under review tag, not your reason. Payouts shows how much is on hold, and Mark paid skips held orders. Clearing a flag makes the order payable again. Every flag and clear is kept on file." },
    ],
  },
  {
    id: "2026-11-26",
    date: "26 Nov 2026",
    title: "Sales dashboard, commission and payouts",
    items: [
      { icon: "ti-chart-pie", title: "Overview tab", text: "One page for the month: revenue with the change from last month, revenue by channel (Wholesale shown separately), orders, enquiries, and commission earned, paid and unpaid. Below that are the enquiry funnel (enquiries, pipeline, negotiation, won), where deals come from, win rate by salesperson, visitor levels and why deals were lost. A Needs attention box flags deals going cold and unpaid commission." },
      { icon: "ti-trophy", title: "My Sales and commission rules", text: "Salespeople get a private commission meter. You see everyone's on the same page, with a warning when an order names a salesperson who isn't a user (nobody earns on that order until it's fixed). The rules are in Settings under Commission rules: slabs, the GST factor (0.82) and which channels count. Changes apply to every month, including past ones." },
      { icon: "ti-cash", title: "Payouts", text: "After a month ends, open Payouts and press Mark paid for each person. It pays their delivered orders at the month's final rate and records an optional reference. It doesn't move money. Orders delivered later go into the next payment at the same rate. If you record one by mistake, Void it: the record stays and the orders become payable again." },
      { icon: "ti-walk", title: "Visits and website enquiries", text: "Showroom staff log walk-ins on the Visits tab and add the serious ones to the pipeline. Website enquiries are entered on the same tab and go straight into the pipeline with their source." },
      { icon: "ti-list-check", title: "Pipeline: Today view", text: "Sales staff open Pipeline on Today, with a Called ✓ button that sets the next follow-up or marks the deal lost with a reason. Your own view still opens on Table. Deals with no follow-up date that were last contacted more than 30 days ago are archived under Older; nothing was deleted or changed in the data." },
      { icon: "ti-info-circle", title: "How commission is worked out", text: "It's based on each person's own monthly sales including GST, multiplied by 0.82. Showrooms and Website only. Earned means every item on the order is delivered. Orders that are archived and not fully delivered don't count. There is no leaderboard, and salespeople only ever see their own numbers." },
    ],
  },
];

export const LOGS = { sales: SALES, admin: ADMIN };
export const logFor = role => LOGS[role] || null;
