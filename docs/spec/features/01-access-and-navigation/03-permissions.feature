@epic:access @status:done
Feature: Roles and permissions
  Permissions are granted per person on the whole site or on top-level folders, so everyone can do their job and nobody can do more than they should.

  Background:
    Given the permissions are Read, Edit, Review & approve, Publish and Manage
    And they are granted on the whole site or on a top-level folder

  # Business benefit: Approval rights follow the bank's segregation-of-duties rules, which supports regulatory compliance. Sensible defaults also cut the admin effort of setting up each new person.
  Rule: US-01.03.1 · Give each role and workflow step the right permissions
    As a business owner
    I want each role to come with sensible defaults and each workflow step to need its permission
    So that only qualified people edit, approve and publish content

    Scenario Outline: Role defaults
      Given a person with the role "<role>" and no individual grants
      Then they can <permissions>

      Examples:
        | role       | permissions                              |
        | Author     | read and edit                            |
        | Reviewer   | read, edit and review                    |
        | Publisher  | read, review and publish                 |
        | Site admin | do everything                            |
        | Viewer     | read                                     |

    Scenario Outline: Status changes
      When someone moves a page to "<status>"
      Then they need <permission>

      Examples:
        | status                    | permission         |
        | Build the page (draft)    | Edit               |
        | Waiting for review        | Edit               |
        | In author's review        | Review & approve   |
        | Ready to publish          | Review & approve   |
        | Scheduled / Published     | Publish            |

  # Business benefit: Access can be tailored per folder, so teams work independently without over-privileged accounts. Every grant is logged, which makes access reviews and audits straightforward.
  @admin @depends:US-01.03.1
  Rule: US-01.03.2 · Manage people and their permissions
    As a site admin
    I want to invite people and grant them permissions on the right folders
    So that everyone has exactly the access their job needs

    Scenario: Granting a permission
      Given I am a site admin on "Users & roles"
      When I click "Edit" on the "Banking" row for "anna.kowalczyk"
      Then she has Edit on Banking and also Read there
      And the audit log says "gave Anna Kowalczyk Edit on Banking"

    Scenario: Inherited permissions
      Given "rachel.hughes" has Review on the whole site
      Then each folder row shows Review as "Inherited from whole site"

    Scenario: Inviting a person
      When I invite "Sam Taylor" as an Author
      Then the sign-in id is "sam.taylor"
      And they get the Author permissions on the whole site

  # Business benefit: Server-side enforcement closes a privilege-escalation risk that would otherwise undermine every other control. It gives security and audit teams evidence that access rules cannot be bypassed.
  @depends:US-01.03.2
  Rule: US-01.03.3 · Only site admins can change access
    As a business owner
    I want only site admins to change users and permissions, enforced on screen and on the server
    So that nobody can grant themselves more than they should have

    Scenario: Non-admins see only themselves
      Given I am signed in as "content.author"
      When I open "Users & roles"
      Then I see only my own profile
      And "Only site admins can change users and permissions"

    Scenario: The server refuses changes from non-admins
      Given I am a viewer
      When I save components of a page or change a user
      Then the answer is 403 with a request id
