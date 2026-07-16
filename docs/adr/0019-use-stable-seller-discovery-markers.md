# Use stable Seller Discovery Markers

Jualokal represents a Seller on the discovery map with one Seller Discovery Marker that denotes a coarse shared area within the hidden Seller Convenience Zone rather than a property-level point; multiple Sellers may share the same area. The same marker is shown to all eligible members and changes only when the Seller changes their Home Anchor; it is neither the Home Anchor nor a Handover Point, and the zone boundary remains hidden. Keeping the marker stable prevents repeated views from being averaged to infer the Home Anchor and avoids making the Seller appear to move between visits.

When Seller Discovery Markers overlap or share an area, Jualokal groups them at their existing position and never scatters them into invented positions, because artificial separation would falsely imply more precise Seller location information.

Because a Seller Discovery Marker may appear as far as 3 km from a buyer whose Browsing Location is within the 2 km Discovery Radius of the protected Home Anchor, the initial map remains buyer-centered with a normal 2 km local context and expands only as needed, up to 3 km, to include every qualifying marker. Jualokal does not draw the precise Discovery Radius boundary, and recentering restores this framing without changing the Browsing Location or discovery eligibility.
