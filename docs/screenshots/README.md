# README screenshots

Actual public-page captures from the local FanOS frontend at a 1440 × 1000 desktop viewport. No authenticated user data is included.

| File | Content |
| --- | --- |
| `landing.png` | Landing hero and the beginning of its sample dashboard illustration. |
| `workflow.png` | The six-step community-to-project workflow. |
| `features.png` | Public feature overview. |
| `signup.png` | Account registration interface. |

The dashboard illustration uses sample values and is labelled on the landing page. These files do not represent a populated live creator account.

To refresh the images, run `npm run dev` from `frontend/`, open `http://localhost:3000` at the same viewport width, and capture the landing viewport, `#how` section, `#features` section, and `/auth/signup`. Wait for fonts and section reveal animations to finish before capturing. Save PNGs with the names above and verify the main README renders them.

For future authenticated screenshots, use an authorized test account and remove personal information before committing captures. Add image links to the main README only when the corresponding files exist.
