import {mockKalturaBe, loadPlayer, MANIFEST, MANIFEST_SAFARI} from './env';

Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Hotspots plugin', () => {
  beforeEach(() => {
    // manifest
    cy.intercept('GET', '**/a.m3u8*', Cypress.browser.name === 'webkit' ? MANIFEST_SAFARI : MANIFEST);
    // thumbnails
    cy.intercept('GET', '**/width/164/vid_slices/100', {fixture: '100.jpeg'});
    cy.intercept('GET', '**/height/360/width/640', {fixture: '640.jpeg'});
    // kava
    cy.intercept('GET', '**/index.php?service=analytics*', {});
  });

  describe('test hotspots start-end time', () => {
    it('should render hotspot container witout hotspots', () => {
      mockKalturaBe('cue-points.json');
      loadPlayer({}, {startTime: 55}).then(() => {
        cy.get('[data-testid="hotspots_hotspotsContainer"]').should('exist');
        cy.get('[data-testid="hotspots_hotspot"]').should('have.length', 0);
      });
    });
    it('should render hotspot on 0:00', () => {
      mockKalturaBe('cue-points.json');
      loadPlayer().then(() => {
        cy.get('[data-testid="hotspots_hotspotsContainer"]').should('exist');
        cy.get('[data-testid="hotspots_hotspot"]').should('have.length', 1);
      });
    });
    it('should render hotspot on 0:10', () => {
      mockKalturaBe('cue-points.json');
      loadPlayer({}, {startTime: 10}).then(() => {
        cy.get('[data-testid="hotspots_hotspotsContainer"]').should('exist');
        cy.get('[data-testid="hotspots_hotspot"]').should('have.length', 2);
      });
    });
    it('should hide hotspot on 0:20', () => {
      mockKalturaBe('cue-points.json');
      loadPlayer({}, {startTime: 10}).then(player => {
        cy.get('[data-testid="hotspots_hotspotsContainer"]').should('exist');
        cy.get('[data-testid="hotspots_hotspot"]')
          .should('have.length', 2)
          .then(() => {
            player.currentTime = 20;
            cy.get('[data-testid="hotspots_hotspot"]').should('have.length', 1);
          });
      });
    });
  });
  describe('test hotspots styles and actions', () => {
    it('should test hotspots styles', () => {
      mockKalturaBe('cue-points.json');
      loadPlayer({}, {startTime: 11}).then(player => {
        player.pause();
        const first = cy.get('[aria-label="Hotspot on 0:00-0:50"]');
        first.should('have.text', 'Hotspot on 0:00-0:50');
        first.children().should('have.css', {background: 'rgba(27, 219, 85, 0.6)', color: 'rgb(0, 0, 0)'});
        const last = cy.get('[aria-label="hotspot on 0:10-0:20"]');
        last.should('have.text', 'hotspot on 0:10-0:20');
        last.children().should('have.css', {background: 'rgb(255, 255, 255)', color: 'rgb(255, 0, 0)'});
      });
    });
    it('should test hotspots actions', () => {
      mockKalturaBe('cue-points.json');
      loadPlayer({}, {startTime: 11}).then(player => {
        player.pause();
        cy.get('[aria-label="hotspot on 0:10-0:20"]')
          .click({force: true})
          .then(() => {
            expect(player.currentTime).to.be.closeTo(30, 1);
          });
        cy.window().then(win => {
          cy.spy(win, 'open').as('windowOpen');
          cy.get('[aria-label="Hotspot on 0:00-0:50"]').click({force: true});
          cy.get('@windowOpen').should('be.calledWith', 'https://google.com', '_blank');
        });
      });
    });
  });
});
