#!/usr/bin/env bun

/**
 * SQL Syntax Validation
 * 
 * This script performs basic syntax validation on SQL migration files
 * to catch common issues before attempting to apply them.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

function validateSQLSyntax() {
  console.log('🔍 Validating SQL Migration Syntax');
  console.log('==================================');
  console.log('');

  try {
    const migrationPath = join(__dirname, '../database/migrations/012_chat_system_complete.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    let hasErrors = false;
    const lines = sql.split('\n');
    
    console.log('📋 Checking for common SQL syntax issues...');
    console.log('');

    // Check 1: Function delimiters
    console.log('1. 🔍 Checking function delimiters...');
    const functionStarts = sql.match(/RETURNS\s+\w+\s+AS\s+\$/g);
    const functionEnds = sql.match(/END;\s*\$\$/g);
    
    if (functionStarts && functionEnds) {
      if (functionStarts.length !== functionEnds.length) {
        console.log('   ❌ Mismatched function delimiters');
        console.log(`   Found ${functionStarts.length} function starts but ${functionEnds.length} function ends`);
        hasErrors = true;
      } else {
        console.log(`   ✅ Function delimiters balanced (${functionStarts.length} functions)`);
      }
    } else {
      console.log('   ✅ No functions found or delimiters look correct');
    }

    // Check 2: Incomplete SQL keywords
    console.log('2. 🔍 Checking for incomplete SQL keywords...');
    const incompleteKeywords = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^[a-z]/)) {
        // Line starts with lowercase - might be incomplete keyword
        if (!line.startsWith('language') && !line.startsWith('plpgsql')) {
          incompleteKeywords.push({ line: i + 1, content: line });
        }
      }
    }
    
    if (incompleteKeywords.length > 0) {
      console.log('   ❌ Found potential incomplete keywords:');
      incompleteKeywords.forEach(item => {
        console.log(`   Line ${item.line}: ${item.content}`);
      });
      hasErrors = true;
    } else {
      console.log('   ✅ No incomplete keywords found');
    }

    // Check 3: NOW() in index predicates
    console.log('3. 🔍 Checking for NOW() in index predicates...');
    const nowInIndex = sql.match(/CREATE\s+INDEX[^;]*WHERE[^;]*NOW\(\)/gi);
    
    if (nowInIndex) {
      console.log('   ❌ Found NOW() in index predicate (not IMMUTABLE):');
      nowInIndex.forEach(match => {
        console.log(`   ${match.substring(0, 80)}...`);
      });
      hasErrors = true;
    } else {
      console.log('   ✅ No NOW() functions in index predicates');
    }

    // Check 4: Unmatched quotes
    console.log('4. 🔍 Checking for unmatched quotes...');
    const singleQuotes = (sql.match(/'/g) || []).length;
    const doubleQuotes = (sql.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0) {
      console.log(`   ❌ Unmatched single quotes (found ${singleQuotes})`);
      hasErrors = true;
    } else {
      console.log(`   ✅ Single quotes balanced (${singleQuotes / 2} pairs)`);
    }
    
    if (doubleQuotes % 2 !== 0) {
      console.log(`   ❌ Unmatched double quotes (found ${doubleQuotes})`);
      hasErrors = true;
    } else {
      console.log(`   ✅ Double quotes balanced (${doubleQuotes / 2} pairs)`);
    }

    // Check 5: Basic SQL structure
    console.log('5. 🔍 Checking basic SQL structure...');
    const createStatements = (sql.match(/CREATE\s+/gi) || []).length;
    const semicolons = (sql.match(/;/g) || []).length;
    
    console.log(`   📊 Found ${createStatements} CREATE statements`);
    console.log(`   📊 Found ${semicolons} semicolons`);
    
    if (createStatements === 0) {
      console.log('   ⚠️  No CREATE statements found - is this a valid migration?');
    } else {
      console.log('   ✅ SQL structure looks reasonable');
    }

    console.log('');
    console.log('📋 Validation Summary:');
    console.log('=====================');
    
    if (hasErrors) {
      console.log('❌ SQL validation failed - please fix the issues above');
      console.log('');
      console.log('💡 Common fixes:');
      console.log('   - Ensure function delimiters use $$ not $');
      console.log('   - Check for broken comment lines splitting keywords');
      console.log('   - Remove NOW() from index WHERE clauses');
      console.log('   - Verify all quotes are properly matched');
      return false;
    } else {
      console.log('✅ SQL validation passed - migration looks good!');
      console.log('');
      console.log('🚀 Ready to apply migration:');
      console.log('   1. Go to Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy/paste the migration SQL');
      console.log('   4. Execute the migration');
      return true;
    }

  } catch (error) {
    console.error('❌ Failed to validate SQL:', error);
    return false;
  }
}

// Run validation
const isValid = validateSQLSyntax();
process.exit(isValid ? 0 : 1);