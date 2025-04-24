// csvImporter.js - Handles CSV file imports

/**
 * Handles CSV file upload and parsing
 * @param {File} file - The uploaded CSV file
 * @param {Function} onSuccess - Callback for successful parsing
 * @param {Function} onError - Callback for errors
 */
function handleCSVUpload(file, onSuccess, onError) {
    if (!file) {
        if (onError) onError('No file selected');
        return;
    }
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
        if (onError) onError('Please upload a CSV file');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const { headers, data } = window.helpers.parseCSV(csvContent, true);
            
            if (onSuccess) {
                onSuccess({
                    headers,
                    data,
                    filename: file.name,
                    recordCount: data.length
                });
            }
        } catch (error) {
            console.error('Error parsing CSV:', error);
            if (onError) onError('Failed to parse CSV file. Please check the format.');
        }
    };
    
    reader.onerror = function() {
        if (onError) onError('Failed to read the file');
    };
    
    reader.readAsText(file);
}

/**
 * Preview CSV data in a table
 * @param {Array} headers - CSV headers
 * @param {Array} data - CSV data rows
 * @param {string} containerId - ID of container element
 * @param {number} previewRows - Number of rows to preview (default 5)
 */
function previewCSV(headers, data, containerId, previewRows = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Only show the first few rows for preview
    const previewData = data.slice(0, previewRows);
    
    let tableHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
    `;
    
    // Add headers
    headers.forEach(header => {
        tableHTML += `<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${header}</th>`;
    });
    
    tableHTML += `
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    // Add data rows
    previewData.forEach((row, rowIndex) => {
        tableHTML += `<tr${rowIndex % 2 === 0 ? ' class="bg-gray-50"' : ''}>`;
        
        headers.forEach(header => {
            tableHTML += `<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">${row[header] || ''}</td>`;
        });
        
        tableHTML += `</tr>`;
    });
    
    // Add indicator for more rows
    if (data.length > previewRows) {
        tableHTML += `
            <tr>
                <td colspan="${headers.length}" class="px-3 py-2 text-sm text-gray-500 text-center italic">
                    ... and ${data.length - previewRows} more rows
                </td>
            </tr>
        `;
    }
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

/**
 * Process students CSV data
 * @param {Array} data - Parsed CSV data
 * @returns {Array} Processed student records
 */
function processStudentsCSV(data) {
    // Expected CSV format: Name, Email, Class Group
    return data.map((row, index) => {
        const classGroupName = row['Class Group'] || '';
        
        // Find class group by name
        const classGroup = window.dummyData.classGroups.find(
            cg => cg.name.toLowerCase() === classGroupName.toLowerCase()
        );
        
        return {
            id: window.dummyData.students.length + index + 1, // Generate new ID
            name: row['Name'] || '',
            email: row['Email'] || '',
            class_group_id: classGroup ? classGroup.id : null
        };
    });
}

/**
 * Process subjects CSV data
 * @param {Array} data - Parsed CSV data
 * @returns {Array} Processed subject records
 */
function processSubjectsCSV(data) {
    // Expected CSV format: Name, Credit Value, Type, Academic Year
    return data.map((row, index) => {
        const academicYearName = row['Academic Year'] || '';
        const type = (row['Type'] || '').toLowerCase();
        
        // Find academic year by name
        const academicYear = window.dummyData.academicYears.find(
            ay => ay.name === academicYearName
        );
        
        // Validate subject type
        let validType = 'other';
        if (['core', 'optional', 'short', 'other'].includes(type)) {
            validType = type;
        }
        
        return {
            id: window.dummyData.subjects.length + index + 1, // Generate new ID
            name: row['Name'] || '',
            credit_value: parseInt(row['Credit Value'] || 0),
            type: validType,
            academic_year_id: academicYear ? academicYear.id : null
        };
    });
}

/**
 * Process teachers CSV data
 * @param {Array} data - Parsed CSV data
 * @returns {Array} Processed teacher records
 */
function processTeachersCSV(data) {
    // Expected CSV format: Name, Email, Is Admin (Yes/No)
    return data.map((row, index) => {
        return {
            id: window.dummyData.teachers.length + index + 1, // Generate new ID
            name: row['Name'] || '',
            email: row['Email'] || '',
            is_admin: (row['Is Admin'] || '').toLowerCase() === 'yes'
        };
    });
}

/**
 * Import processed data to the database
 * @param {string} entityType - The type of entity (students, subjects, teachers)
 * @param {Array} processedData - The data to import
 * @returns {Promise} Promise that resolves when import is complete
 */
function importData(entityType, processedData) {
    return new Promise((resolve, reject) => {
        try {
            // In production, this would call the API to perform the import
            // For the prototype, we'll just update the dummy data
            
            switch(entityType) {
                case 'students':
                    // Add new students to the dummy data
                    processedData.forEach(student => {
                        window.dummyData.students.push(student);
                    });
                    break;
                    
                case 'subjects':
                    // Add new subjects to the dummy data
                    processedData.forEach(subject => {
                        window.dummyData.subjects.push(subject);
                    });
                    break;
                    
                case 'teachers':
                    // Add new teachers to the dummy data
                    processedData.forEach(teacher => {
                        window.dummyData.teachers.push(teacher);
                    });
                    break;
                    
                default:
                    throw new Error(`Unsupported entity type: ${entityType}`);
            }
            
            resolve({
                success: true,
                message: `Successfully imported ${processedData.length} ${entityType}`,
                count: processedData.length
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Export CSV importer functions to the global scope
window.csvImporter = {
    handleCSVUpload,
    previewCSV,
    processStudentsCSV,
    processSubjectsCSV,
    processTeachersCSV,
    importData
};
