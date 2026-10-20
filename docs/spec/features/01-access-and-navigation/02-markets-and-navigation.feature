@epic:access @status:done
Feature: Markets, environments and navigation
  As someone who works across several HSBC markets
  I want to switch market and environment and reach any screen quickly
  So that one platform serves every country without confusion

  Rule: Markets are grouped by instance

    Scenario Outline: Instances
      When I choose the instance "<instance>"
      Then the market list shows <markets>

      Examples:
        | instance | markets              |
        | EMEA     | UK, France, Germany, UAE |
        | APAC     | Hong Kong, Singapore |
        | NA       | Mexico               |

    Scenario: Switching market keeps my place
      Given I am on Pages in the UK
      When I switch to "HSBC France"
      Then I am on Pages in France

  Rule: The environment is always visible

    Scenario Outline: Environment note
      When I choose "<environment>"
      Then the dashboard says "<note>"

      Examples:
        | environment | note                                              |
        | Production  | Publishing here goes live for customers.          |
        | Staging     | Nothing in this environment reaches customers.    |

  Rule: Everything is reachable in two keystrokes

    Scenario: Command palette
      When I press ⌘ K
      Then I can find pages and go to any section
      And in the page builder I can ask AI or add a component from it
      And Tab stays inside the palette and Esc returns focus to where I was

    Scenario: Global search
      When I type "isa" into the top search
      Then I see up to 8 pages, 5 assets, 4 people, 3 templates and 3 models
      And Enter opens the first result

  Rule: The menu adapts to the screen

    Scenario Outline: Side menu
      Given my screen is <width>
      Then the side menu is <behaviour>

      Examples:
        | width                 | behaviour                                   |
        | 1100 px or wider      | full, and I can collapse it to icons        |
        | 768 to 1099 px        | icons only                                  |
        | narrower than 768 px  | hidden behind ☰ and opens as a drawer       |
