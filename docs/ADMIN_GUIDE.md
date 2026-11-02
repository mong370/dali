# Admin guide

For the people running the Dali store. Sign in with an admin account, then choose **Admin panel**
from the account menu, or go to `/admin`.

## Add a product

1. Create its category first if needed, under **Categories**.
2. Go to **Products** and choose **Add product**.
3. Enter the name, category and brand, then upload images. The first image is the main one.
4. Add one row under **Variants and pricing** for each version you sell:

   | What you sell | Options | Price (৳) | Was (৳) | Stock |
   | --- | --- | --- | --- | --- |
   | Rice, 5 kg | `Weight: 5 kg` | 390 | 430 | 40 |
   | Shirt, medium red | `Size: M, Colour: Red` | 1250 | 1700 | 12 |
   | One-version product | leave empty | 750 | 990 | 30 |

   **SKU** is your own unique stock code for that row. **Was** is optional and creates the
   struck-through price and discount, so use it only for a genuine earlier price.

5. Optionally add **Specifications**, one per line, such as `Warranty: 1 year`.
6. Tick the homepage rows it should appear in, then choose **Save product**.

Use **Draft** to hide a product while you prepare it. Avoid editing a product's stock while it is
selling quickly, because saving writes the numbers shown when you opened the form.

## How admin lists work

Products, Orders, Categories, Coupons, Users and Banners all work the same way. Count cards at the top show totals, and tapping one filters the list. Use the search box and filters to narrow it down, and choose how many rows show per page below the list. Anything that deletes or restricts something asks you to confirm first.

## Manage categories

**Categories** shows count cards, search and filters above the full list. Below the list you can choose how many categories show per page and jump between numbered pages. Tap a count card to show just that group, and tap it again to clear it. Use **Add category** or **Edit** to open the category form, where you can drag an icon image into the upload area or click it to browse. Deleting asks you to confirm first. A category can only be deleted once it has no subcategories and no products, and the popup says so if it still has any.

## Find products by homepage section

In **Products**, use the **All homepage sections** filter to list only the products shown in a section, such as Best Deal or Featured Products. It combines with the other filters and search.

## Process an order

Open **Orders**, select an order and move it forward:

**Pending → Confirmed → Processing → Shipped → Delivered**

- Marking **Delivered** records the cash as paid.
- **Cancelled** (before shipping) and **Returned** put the items back in stock.
- Status changes can't be undone, so check before confirming. Notes you add are shown to the customer.

Customers can cancel their own order while it is Pending or Confirmed.

## Coupons

Under **Coupons**, create a percentage, fixed amount or free-shipping offer. You can set a maximum
discount, minimum order, usage limit, expiry date, or restrict it to first orders. Each order can use
one coupon.

The homepage "First order deal" strip mentions code `FREESHIP` and ৳200. If you change that coupon,
update the text in `frontend/src/pages/HomePage.tsx`.

## Homepage

- **Banners** page: add, edit, hide or delete the banners in the homepage carousel. The Dali promotion card is part of the site's code, in `frontend/src/pages/HomePage.tsx`.
- **Category product cards:** the four cards at the bottom of the homepage. In **Categories**, edit a category and tick **Show product card on homepage** on up to four categories. Each card shows that category's 4 best sellers, including its subcategories. If you tick more than four, the first four in category order appear.
- **Product rows:** controlled by the homepage ticks on each product. Each row shows the 6 best
  sellers ticked for it, or 7 for the Featured Products and First order deal strips. A row with no ticked products is hidden.
- **Category icons:** the top-level categories, in **Categories**. Each uses its uploaded image if it has one, otherwise its emoji. A square PNG or WebP with a transparent background looks best. Tick **Show in header navigation**
  to add a category to the pills under the search bar.

## Users

Use **Add user** to create an account and the pencil icon to edit one, including setting a new password. Admins have full access, so grant the Admin role carefully.

- **Disable:** a temporary pause. The account can't sign in until you enable it again.
- **Ban:** for abuse. It needs a reason, which the person sees when they try to sign in. You can lift a ban later.
- **Delete:** removes the account permanently. Their orders are kept as records, and their reviews stay under "Former customer". They could sign up again with the same email, so ban instead if you want to keep someone out.

You can't disable, ban or delete your own account. A change takes effect at sign-in straight away, and an already signed-in person can keep browsing for up to 15 minutes.
  decision; follow up with the applicant directly.
