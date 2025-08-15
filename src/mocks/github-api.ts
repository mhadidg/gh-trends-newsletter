// Mock GitHub GraphQL API response
export const mockGitHubResponse = {
  data: {
    search: {
      nodes: [
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODk=',
          nameWithOwner: 'example/awesome-project',
          url: 'https://github.com/example/awesome-project',
          description: 'An awesome new project that does amazing things',
          primaryLanguage: {
            name: 'TypeScript',
          },
          createdAt: '2024-12-15T10:30:00Z',
          stargazerCount: 1250,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTA=',
          nameWithOwner: 'dev/cool-tool',
          url: 'https://github.com/dev/cool-tool',
          description: 'A cool CLI tool for developers',
          primaryLanguage: {
            name: 'Go',
          },
          createdAt: '2024-12-14T15:45:00Z',
          stargazerCount: 890,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTE=',
          nameWithOwner: 'startup/ml-framework',
          url: 'https://github.com/startup/ml-framework',
          description: 'Next-gen machine learning framework',
          primaryLanguage: {
            name: 'Python',
          },
          createdAt: '2024-12-13T08:20:00Z',
          stargazerCount: 2100,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTI=',
          nameWithOwner: 'team/web-component',
          url: 'https://github.com/team/web-component',
          description: 'Reusable web components library',
          primaryLanguage: {
            name: 'JavaScript',
          },
          createdAt: '2024-12-12T12:00:00Z',
          stargazerCount: 675,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTM=',
          nameWithOwner: 'org/data-viz',
          url: 'https://github.com/org/data-viz',
          description: 'Beautiful data visualization library',
          primaryLanguage: {
            name: 'JavaScript',
          },
          createdAt: '2024-12-11T16:30:00Z',
          stargazerCount: 1450,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTQ=',
          nameWithOwner: 'devs/api-client',
          url: 'https://github.com/devs/api-client',
          description: 'Universal API client with type safety',
          primaryLanguage: {
            name: 'TypeScript',
          },
          createdAt: '2024-12-10T09:15:00Z',
          stargazerCount: 720,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTU=',
          nameWithOwner: 'company/mobile-app',
          url: 'https://github.com/company/mobile-app',
          description: 'Cross-platform mobile development kit',
          primaryLanguage: {
            name: 'Dart',
          },
          createdAt: '2024-12-09T14:45:00Z',
          stargazerCount: 980,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTY=',
          nameWithOwner: 'community/game-engine',
          url: 'https://github.com/community/game-engine',
          description: 'Lightweight 2D game engine',
          primaryLanguage: {
            name: 'C++',
          },
          createdAt: '2024-12-08T11:20:00Z',
          stargazerCount: 1800,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTc=',
          nameWithOwner: 'makers/design-system',
          url: 'https://github.com/makers/design-system',
          description: 'Modern design system components',
          primaryLanguage: {
            name: 'CSS',
          },
          createdAt: '2024-12-07T13:10:00Z',
          stargazerCount: 540,
        },
        {
          id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OTg=',
          nameWithOwner: 'builders/deployment-tool',
          url: 'https://github.com/builders/deployment-tool',
          description: 'Simplified deployment automation',
          primaryLanguage: {
            name: 'Rust',
          },
          createdAt: '2024-12-06T17:25:00Z',
          stargazerCount: 1320,
        },
      ],
    },
  },
};
