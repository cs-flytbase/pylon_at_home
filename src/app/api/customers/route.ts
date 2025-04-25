import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { CustomerInsert } from "@/types/customer";
import { logDatabaseError } from "@/lib/error-logger";

// GET - Fetch all customers, with optional organization filter
export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  const searchQuery = url.searchParams.get("search");
  
  try {
    const supabase = await createClient();
    
    let query = supabase.from("customers").select(`
      *,
      organization:organization_id (
        id,
        name,
        type
      )
    `);

    // Apply organization filter if provided
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    
    // Apply search filter if provided
    if (searchQuery) {
      query = query.or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });
    
    if (error) {
      logDatabaseError(error, "customers", "getAll");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    logDatabaseError(err, "customers", "getAll_exception");
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST - Create a new customer
export async function POST(request: Request) {
  try {
    const customerData = await request.json();
    const supabase = await createClient();
    
    // Validate the customer data
    if (!customerData.first_name || !customerData.last_name || !customerData.email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }
    
    // Get current user to track who created this customer
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      customerData.created_by = userData.user.id;
    }
    
    const { data, error } = await supabase
      .from("customers")
      .insert(customerData as CustomerInsert)
      .select()
      .single();
      
    if (error) {
      // Check for duplicate email error
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json(
          { error: "A customer with this email already exists" },
          { status: 409 }
        );
      }
      
      logDatabaseError(error, "customers", "create");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logDatabaseError(err, "customers", "create_exception");
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing customer
export async function PATCH(request: Request) {
  try {
    const customerData = await request.json();
    const supabase = await createClient();
    
    // Validate the request
    if (!customerData.id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }
    
    // Remove id from the update data
    const { id, ...updateData } = customerData;
    
    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      logDatabaseError(error, "customers", "update");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    logDatabaseError(err, "customers", "update_exception");
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}
