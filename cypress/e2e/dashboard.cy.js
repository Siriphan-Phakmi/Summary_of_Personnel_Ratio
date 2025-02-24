describe('Dashboard Page', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('button').contains('Dashboard').click();
  });

  it('displays patient census correctly', () => {
    cy.get('[data-testid="patient-census"]').should('be.visible');
    cy.get('[data-testid="total-patients"]').should('contain', '71');
  });

  it('shows all ward sections', () => {
    const wards = ['Ward11', 'Ward6', 'LR', 'Ward9', 'Ward10B', 'NSY', 'WardGI', 'Ward8'];
    wards.forEach(ward => {
      cy.get(`[data-testid="${ward}"]`).should('be.visible');
    });
  });

  it('displays correct patient numbers for each ward', () => {
    const wardData = {
      'Ward11': '19',
      'Ward6': '11',
      'LR': '0',
      'Ward9': '0',
      'Ward10B': '9',
      'NSY': '0',
      'WardGI': '5',
      'Ward8': '0'
    };

    Object.entries(wardData).forEach(([ward, count]) => {
      cy.get(`[data-testid="${ward}-count"]`).should('contain', count);
    });
  });

  it('shows bed distribution chart', () => {
    cy.get('[data-testid="bed-distribution-chart"]').should('be.visible');
  });

  it('shows overall data chart', () => {
    cy.get('[data-testid="overall-data-chart"]').should('be.visible');
  });

  it('allows date selection', () => {
    cy.get('[data-testid="date-picker"]').click();
    cy.get('.calendar').should('be.visible');
    // Select a date
    cy.get('.calendar-day').first().click();
    // Verify data updates
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
  });

  it('allows shift selection', () => {
    cy.get('[data-testid="shift-selector"]').click();
    cy.get('[data-testid="shift-07:00-19:00"]').click();
    // Verify data updates for selected shift
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
  });

  it('handles errors gracefully', () => {
    // Simulate network error
    cy.intercept('GET', '/api/dashboard-data', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    });
    cy.reload();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });
}); 