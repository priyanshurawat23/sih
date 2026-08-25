export const doctorInfo = {
  "General Physician": {
    description: "Primary care provider for overall health and preventive care.",
    treats: ["Fever", "Common Cold", "Minor Infections", "General Weakness", "Routine Checkups"],
    icon: "stethoscope",
    whenToVisit: "For general symptoms, undiagnosed issues, or basic checkups.",
    urgencyNote: "Varies based on symptoms. Usually routine, but see soon if symptoms persist."
  },
  "Cardiologist": {
    description: "Specializes in diagnosing and treating diseases of the cardiovascular system.",
    treats: ["Heart Disease", "Hypertension", "Arrhythmia", "High Cholesterol", "Chest Pain"],
    icon: "heart-pulse",
    whenToVisit: "If you have chest pain, shortness of breath, palpitations, or abnormal ECG/lipid profile.",
    urgencyNote: "Can be URGENT for chest pain, otherwise SOON for abnormal labs."
  },
  "Endocrinologist": {
    description: "Focuses on hormones and the glands that produce them.",
    treats: ["Diabetes", "Thyroid Disorders", "Hormonal Imbalances", "Osteoporosis"],
    icon: "needle", 
    whenToVisit: "For uncontrolled blood sugar, abnormal thyroid levels, or suspected hormonal issues.",
    urgencyNote: "Usually SOON for abnormal lab results."
  },
  "Hematologist": {
    description: "Specializes in diseases related to blood.",
    treats: ["Anemia", "Bleeding Disorders", "Blood Cancers", "Clotting Issues"],
    icon: "water",
    whenToVisit: "For abnormal CBC, unexplainable bruising, severe fatigue.",
    urgencyNote: "SOON or URGENT depending on the severity of blood count abnormalities."
  },
  "Nephrologist": {
    description: "Specializes in kidney care and treating diseases of the kidneys.",
    treats: ["Chronic Kidney Disease", "Kidney Stones", "Renal Failure", "High Blood Pressure"],
    icon: "water-outline",
    whenToVisit: "For abnormal creatinine/BUN levels, protein in urine, or severe hypertension.",
    urgencyNote: "SOON for deteriorating kidney function markers."
  },
  "Hepatologist": {
    description: "Focuses on diseases of the liver, gallbladder, biliary tree, and pancreas.",
    treats: ["Hepatitis", "Cirrhosis", "Fatty Liver", "Liver Cancer"],
    icon: "bottle-tonic-plus",
    whenToVisit: "For abnormal liver function tests (LFTs), jaundice, or liver pain.",
    urgencyNote: "SOON for significantly elevated enzymes or jaundice."
  },
  "Pulmonologist": {
    description: "Specializes in the respiratory system and lung diseases.",
    treats: ["Asthma", "COPD", "Pneumonia", "Tuberculosis", "Lung Cancer"],
    icon: "lungs",
    whenToVisit: "For chronic cough, shortness of breath, or abnormal chest X-ray.",
    urgencyNote: "Can be URGENT for severe breathing difficulties."
  },
  "Gastroenterologist": {
    description: "Treats disorders of the stomach and intestines.",
    treats: ["Acid Reflux", "IBS", "Ulcers", "Celiac Disease", "Crohn's Disease"],
    icon: "stomach",
    whenToVisit: "For chronic stomach pain, severe indigestion, or blood in stool.",
    urgencyNote: "SOON for persistent severe symptoms."
  },
  "Oncologist": {
    description: "Specializes in diagnosing and treating cancer.",
    treats: ["Various Cancers", "Tumors", "Malignancies"],
    icon: "ribbon",
    whenToVisit: "For suspected malignancies, abnormal biopsies, or cancer management.",
    urgencyNote: "URGENT/SOON based on findings and progression."
  }
};
