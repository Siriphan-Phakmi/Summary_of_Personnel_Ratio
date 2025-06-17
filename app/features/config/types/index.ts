/**
 * Represents the structure of a form's configuration document
 * stored in Firestore.
 */
export interface FormConfiguration {
  /**
   * An array of field names, defining the order in which they should appear.
   * e.g., ["username", "password", "submitButton"]
   */
  fieldOrder?: string[];

  /**
   * A map of field names to their corresponding display labels.
   * This is used for general labels, buttons, titles, etc.
   * e.g., { "username": "Username", "pageTitle": "Approval Page" }
   */
  labels: { [key: string]: string };

  /**
   * A map of field names to their placeholder text.
   * e.g., { "username": "Enter your username" }
   */
  placeholders?: { [key: string]: string };

  /**
   * A map of section headers for grouping fields.
   * e.g., { "patientMovement": "Admissions / Discharges" }
   */
  sections?: { [key: string]: string };

  /**
   * A map of helper or instructional texts.
   * e.g., { "patientCensusInfo": "* Calculated from last night's shift" }
   */
  helpers?: { [key: string]: string };
  
  /**
   * [Approval Form Specific] A map for table header labels.
   */
  tableHeaders?: { [key: string]: string };
  
  /**
   * [Approval Form Specific] A map for status badge labels.
   */
  statusBadges?: { [key: string]: string };

  /**
   * [Approval Form Specific] A map containing all text for modals.
   */
  modal?: { [key: string]: string };
} 