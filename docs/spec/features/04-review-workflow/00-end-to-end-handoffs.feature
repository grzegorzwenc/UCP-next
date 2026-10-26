@epic:review-workflow @status:done
Feature: End-to-end journey of a page (who hands it to whom)
  A page moves through the workflow by hand-offs. Each step is done by a different person;
  the author never clicks through the whole flow alone. The author requests the next step,
  waits, and gets the page back at the end. Only a site admin can walk every step (demo and
  emergencies), and every such step is recorded as "on behalf of".

  Background:
    Given these people work on the UK site
      | person         | persona         | permissions on the folder           |
      | content.author | content author  | Read, Edit                          |
      | rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
      | david.clarke   | business owner  | Read, Review & approve              |
      | jordan.mensah  | publisher       | Read, Review & approve, Publish     |
      | super.admin    | site admin      | everything                          |

  # Business benefit: Every page passes through separate authoring, review, sign-off and publishing hands, which builds four-eyes control into the process itself. Clear hand-offs cut idle time between teams and shorten time to market.
  @depends:US-04.01.1 @depends:US-04.02.2 @depends:US-04.03.2 @depends:US-05.01.1
  Rule: US-04.00.1 · Hand the page over step by step
    As a content author
    I want to request each next step instead of doing it myself
    So that every page is checked by other people before customers see it

    Scenario: The happy path, one person per step
      Given "content.author" built the page "Cash ISA"
      When "content.author" sends it for review
      Then it waits in the Backlog for any reviewer
      When "rachel.hughes" takes it, reviews it and chooses "Send to business review"
      Then it waits for a business reviewer
      When "david.clarke" takes it and signs it off
      Then it is "Ready to publish"
      When "jordan.mensah" publishes it
      Then it is "Published"
      And "content.author" sees "Cash ISA" under "Published" in My tasks

    Scenario Outline: What the author can do at each stage
      Given the page "Cash ISA" is at "<stage>"
      And I am signed in as "content.author"
      Then the next step for me is "<my action>"
      And the step itself is done by "<who acts>"

      Examples:
        | stage                                  | my action                         | who acts                       |
        | Build the page                         | Send to author's review           | me                             |
        | Waiting for author's review assignment | Wait · "Waiting for a reviewer"   | any reviewer except me         |
        | Assigned to reviewer                   | Remind                            | the assigned reviewer          |
        | In author's review                     | Remind                            | the assigned reviewer          |
        | Waiting for business review assignment | Wait                              | a business owner               |
        | In business review                     | Remind                            | the business reviewer or group |
        | Ready to publish                       | Wait · "Waiting for a publisher"  | a publisher                    |
        | Published                              | Edit to start a new version       | me                             |

  # Business benefit: Rework goes back to one accountable author instead of being patched by reviewers, which keeps responsibility clear. Restarting both reviews after changes means no unchecked edit can reach customers.
  @depends:US-04.00.1
  Rule: US-04.00.2 · Get the page back when someone asks for changes
    As a content author
    I want any reviewer to send the page back to me with comments
    So that I fix it once and the whole check starts again

    Scenario Outline: Reauthor returns the page to the author
      Given "<reviewer>" is reviewing "Cash ISA" at "<stage>"
      When they choose "Reauthor" with comments
      Then the page is back at "Build the page" for "content.author"
      And the comments stay on the page
      And both reviews start over when it is sent again

      Examples:
        | reviewer      | stage              |
        | rachel.hughes | In author's review |
        | david.clarke  | In business review |

  # Business benefit: Segregation of duties is enforced by the system rather than by policy documents, which satisfies four-eyes compliance requirements. Auditors can rely on the platform instead of sampling manual evidence.
  @depends:US-04.00.1
  Rule: US-04.00.3 · Nobody approves their own work
    As the bank
    I want different people for authoring, peer review and business review
    So that the four-eyes principle holds on every page

    Scenario Outline: Four-eyes checks
      Given "<person>" did "<earlier step>" on "Cash ISA"
      When "<person>" tries to "<later step>"
      Then they see "<message>"

      Examples:
        | person         | earlier step      | later step                | message                                                              |
        | content.author | write the page    | take the author's review  | You wrote this page, so someone else reviews it                      |
        | rachel.hughes  | the peer review   | take the business review  | You did the author's review · someone else does the business review  |
        | rachel.hughes  | the peer review   | sign it off               | Someone else must do the business review                             |

    Scenario: An author without Publish cannot put the page live
      Given "Cash ISA" is "Ready to publish"
      And I am signed in as "content.author"
      Then I see "Waiting for a publisher" instead of "Publish"

  # Business benefit: Urgent regulatory or pricing changes can still go live when reviewers are unavailable, which reduces business risk. Every override is recorded as on behalf of a named person, so audit trails stay complete.
  @admin @depends:US-04.00.1 @depends:US-04.00.3
  Rule: US-04.00.4 · Walk the whole flow as a site admin, on record
    As a site admin
    I want to perform any step for the person who should do it
    So that I can demo the platform and unblock urgent pages

    Scenario: Walking every step alone
      Given I am signed in as "super.admin"
      Then every step on the stepper offers its action to me
      And I can take my own page from the Backlog

    Scenario: Acting on behalf is recorded
      Given "rachel.hughes" is the assigned peer reviewer
      When I click "Reviewed for Rachel Hughes"
      Then the audit line ends with "(on behalf of Rachel Hughes)"

    Scenario: Ordinary users never see actions for other people
      Given I am signed in as "content.author"
      Then no button on the stepper or in My tasks lets me act for someone else

  # Business benefit: Planned launch dates reduce last-minute coordination between marketing and publishers. Authors learn when a page is live without chasing anyone, which saves time and avoids missed campaign starts.
  @status:next @depends:US-04.00.1
  Rule: US-04.00.5 · Ask for publishing and hear when the page is live
    As a content author
    I want to request publishing at a date and be told when the page is live
    So that I can plan launches without chasing the publisher

    Scenario: Requesting publishing
      Given "Cash ISA" is "Ready to publish"
      When I click "Request publishing" and choose 1 November at 09:00
      Then the publishers get a task "Publish Cash ISA on 1 Nov 09:00"

    Scenario: Live notification
      When the publisher publishes "Cash ISA"
      Then I get the notification "Cash ISA is live"
