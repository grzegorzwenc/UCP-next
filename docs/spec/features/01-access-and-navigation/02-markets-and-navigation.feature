@epic:access @status:done
Feature: Markets, environments and navigation
  One platform serves every HSBC market; this feature covers switching market and environment and reaching any screen quickly.

  Rule: US-01.02.1 · Switch between markets
    As a content author
    I want to pick an instance and market and switch market without losing my place
    So that I can work across several countries on one platform without confusion

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

  Rule: US-01.02.2 · Always know which environment I am in
    As a publisher
    I want the environment and its consequences always visible
    So that I never publish to customers by mistake

    Scenario Outline: Environment note
      When I choose "<environment>"
      Then the dashboard says "<note>"

      Examples:
        | environment | note                                              |
        | Production  | Publishing here goes live for customers.          |
        | Staging     | Nothing in this environment reaches customers.    |

  Rule: US-01.02.3 · Reach any screen quickly on any device
    As a content author
    I want a command palette, a global search and a menu that fits my screen
    So that every page and section is a couple of keystrokes away

    Scenario: Command palette
      When I press ⌘ K
      Then I can find pages and go to any section
      And in the page builder I can ask AI or add a component from it
      And Tab stays inside the palette and Esc returns focus to where I was

    Scenario: Global search
      When I type "isa" into the top search
      Then I see up to 8 pages, 5 assets, 4 people, 3 templates and 3 models
      And Enter opens the first result

    Scenario Outline: Side menu
      Given my screen is <width>
      Then the side menu is <behaviour>

      Examples:
        | width                 | behaviour                                   |
        | 1100 px or wider      | full, and I can collapse it to icons        |
        | 768 to 1099 px        | icons only                                  |
        | narrower than 768 px  | hidden behind ☰ and opens as a drawer       |
