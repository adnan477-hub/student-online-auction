<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Bids are placed only through the `place_bid` database function — it validates amount, timing and ownership atomically; never insert into `bids` directly.
- Roles live in `user_roles` and are checked with `has_role`; the first registered user becomes admin via the signup trigger.
- Auction "ended/completed" state is derived from `end_time`, not stored — avoids scheduled jobs.
- Live bid updates use Cloud realtime subscriptions on `auctions` and `bids`.
- Auction images live in a private bucket and are referenced by long-lived signed URLs, because public buckets are blocked in this workspace.
