# Interface direction

Use shadcn/ui primitives with a custom statement-oriented composition. This is an operating workspace, used in daylight at an accounts desk or on a parent's low-end phone.

## Tokens

| Role | Value |
| --- | --- |
| Paper | `#FFFFFF` |
| Ink | `#1C292C` |
| Primary teal | `#115E59` |
| Soft surface | `#F3F7F6` |
| Rule | `#DCE5E2` |
| Attention | `#935C00` |

Use Manrope for English and Noto Sans Devanagari for Hindi, self-hosted through installed font packages. The user's final typography request replaced the initial Instrument Sans choice. Keep prose at 16px, table data at 14px, metadata at least 12px, and parent payment amounts at 40–44px. Use tabular numerals for money. Hindi headings use normal tracking and more line height. Controls have a consistent radius; larger panels use 12px. Avoid decorative gradients and repeated shadows. The final extracted tokens are in the root DESIGN.md.

## Compare compositions

A statement layout gives parents a clear next action and preserves a familiar receipt-reading order.

```text
Setu                             English / हिन्दी
Hello, parent
Ishita Sharma                    JEE 2027 Evening

Amount due                          ₹15,000
Due 10 October                      Overdue
[ Pay ₹15,000 ]

Fees       Attendance       Results       Receipts
Next instalments / recent activity
```

A tile dashboard would give equal visual weight to attendance, scores, receipts, and payment. Reject that composition for the parent home because the brief makes dues the first task.

The accounts workspace uses a stable narrow navigation rail, a left-aligned page title, compact filters, a single open metrics row, and a full-width student ledger table. Ageing appears as labelled bars derived from actual balances. Operations use tabs and tables instead of a grid of unrelated cards.

## Review against the brief

Keep the prominent parent amount because the client explicitly asks for amount, date, and Pay within five seconds. Remove extra introductory banners and decorative dashboard widgets. Use the accent for actions and selection; reserve red and amber for meaningful financial exceptions. All totals, statuses, and visible activity must come from persisted demo records.

## Interaction

Use shadcn Button, Field, Input, NativeSelect, Table, Tabs, Badge, Alert, Empty, Skeleton, Dialog, and Checkbox. Dialogs protect payment/refund confirmations. Put routine navigation and filtering inline. Show pending actions, field errors, completion feedback, and recoverable failure states in the same visual system.
