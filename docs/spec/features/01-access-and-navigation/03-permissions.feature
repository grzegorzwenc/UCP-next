@epic:access @status:done
Feature: Roles and permissions
  As a site admin
  I want to grant people the right permissions on the right folders
  So that everyone can do their job and nobody can do more than they should

  Background:
    Given the permissions are Read, Edit, Review & approve, Publish and Manage
    And they are granted on the whole site or on a top-level folder

  Rule: Roles give sensible defaults

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

  Rule: Each workflow step needs its permission

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

  Rule: Only site admins manage people

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

    Scenario: Non-admins see only themselves
      Given I am signed in as "content.author"
      When I open "Users & roles"
      Then I see only my own profile
      And "Only site admins can change users and permissions"

    Scenario: The server refuses changes from non-admins
      Given I am a viewer
      When I save components of a page or change a user
      Then the answer is 403 with a request id
