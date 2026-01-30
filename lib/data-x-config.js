/**
 * Shared configuration for data-x ESLint rules
 * 
 * This file contains common patterns, prefixes, and verbs used across
 * multiple data-x rules for consistent tracking attribute validation.
 */

module.exports = {
  /**
   * Action verbs that indicate on-page interactions
   * Used by: data-x-onpage-action-format
   */
  actionVerbs: {
    // Navigation/Movement
    navigation: ['goto', 'go-to', 'scroll', 'reach', 'back'],
    // Open/Close state changes
    openClose: ['open', 'close', 'toggle'],
    // Visibility changes
    visibility: ['show', 'hide', 'expand', 'collapse'],
    // Media controls
    media: ['play', 'pause', 'stop'],
    // Data operations
    data: ['fetch', 'save', 'copy', 'download', 'clear', 'reset', 'submit'],
    // State changes
    state: ['change', 'accept'],
  },

  /**
   * Get all action verbs as a flat array
   */
  getAllActionVerbs() {
    return Object.values(this.actionVerbs).flat()
  },

  /**
   * Get action verbs as a regex pattern string (for use in RegExp)
   */
  getActionVerbPattern() {
    return this.getAllActionVerbs().join('|')
  },

  /**
   * Prefixes for different types of interactions
   * Used by: data-x-cta-prefix, data-x-clickout-prefix, data-x-toggle-prefix
   */
  prefixes: {
    cta: 'cta-',
    clickout: 'clickout-',
    toggle: 'toggle-',
    link: 'link-to-',
  },

  /**
   * Sectioning elements that require data-x attributes
   * Used by: data-x-required, data-x-sectioning-elements
   */
  sectioningElements: ['form', 'section', 'header', 'footer', 'nav', 'main', 'aside'],
}
