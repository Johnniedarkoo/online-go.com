# Kibitz click continuation

A legal board placement on a posted variation starts a separate draft with the placed move included. Users can extend the line or branch from an earlier position. The original post remains unchanged. Move navigation does not start a draft. The explicit branch button remains available.

Use the existing Goban interface. Observe `cur_move` while public `move_selected` matches the resulting node. Wait for `update`, after placement completes, before starting the draft through the existing posted-variation branch flow. Accept automatic handicap passes following the selected move. Clear pending placement on errors and reloads. Remove listeners when the board or selection changes. Disable further placement once the draft starts.

Capture the draft node-count baseline before replaying the clicked path. This keeps a newly played move unsaved until the user posts or cancels the draft.

Check new moves, existing continuations, navigation, occupied intersections, handicap placement, cleanup, retries, and unsaved draft detection. Run focused tests, type checking, lint, formatting, and the production build. No Goban changes are required.
