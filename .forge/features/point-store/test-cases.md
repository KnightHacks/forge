# Point Store test cases

Status: Derived from user-accepted rules

## Owning boundaries

API integration tests use disposable PostgreSQL and real router calls. Validators cover trust boundaries. SDK tests cover participant contracts. Blade/KHIX browser checks cover operator checkout and hacker catalog states.

## Cases

| Setup                                                                    | Action                                   | Expected observation                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| 100 earned points, item costs 30, stock 2                                | Buy quantity 1                           | Earned total and leaderboard remain 100; spending power 70; stock 1; actor and price recorded |
| Same successful purchase ID                                              | Retry                                    | Same receipt, one charge and one stock decrement                                              |
| Same ID, different item or quantity                                      | Submit                                   | Conflict; original receipt unchanged                                                          |
| Two purchases exceed one hacker's balance                                | Submit concurrently                      | Only an affordable set commits                                                                |
| Two hackers request the last unit                                        | Submit concurrently                      | One purchase commits; stock never negative                                                    |
| Untracked item is available                                              | Purchase                                 | No stock count introduced; spending still recorded                                            |
| Untracked item is sold out, tracked item is empty, or hacker lacks funds | Purchase                                 | Rejected without stock, spending, or audit mutation                                           |
| Hacker belongs to another hackathon or is not checked in                 | Purchase or read catalog                 | Rejected                                                                                      |
| Read Hackers only, officer only, or signed out                           | Access operator endpoint/page            | Rejected; Edit Hackers grants access                                                          |
| Existing purchase                                                        | Rename/reprice/archive item              | History retains original name, price, and quantity                                            |
| Existing purchase                                                        | Void with or without restock, then retry | Spending restored once, stock restored only when selected and applicable, history retained    |
| Item form opened before another purchase                                 | Save stale stock                         | Conflict instead of overwriting the decrement                                                 |
| Hidden catalog                                                           | Fetch participant catalog                | No items or image URLs returned                                                               |
| Visible but closed store                                                 | Browse and record organizer purchase     | Hacker sees closed status and location; organizer transaction succeeds                        |
| Event points plus manual award                                           | Read KHIX points and leaderboard         | Same earned total as Blade; event history remains event history                               |
| Earned-point correction leaves spending greater than earned              | Read balance or buy                      | Spending power is zero; no further purchase allowed                                           |
| Valid and invalid image uploads                                          | Save/replace/remove image                | Valid raster image works; type/signature/size failures reject safely                          |
| Fresh migration                                                          | Read settings                            | Catalog hidden, store closed, location empty                                                  |
| Desktop and 320/390px mobile                                             | Browse forms, history, catalog, locks    | No document overflow; labels, stock, errors, and pending states remain usable                 |

## Open questions

None blocking implementation. Record actual results in status.md.
