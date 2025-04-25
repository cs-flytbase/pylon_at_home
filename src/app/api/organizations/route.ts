import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { OrganizationInsert } from "@/types/customer";
import { logDatabaseError } from "@/lib/error-logger";

// GET - Fetch all organizations, with optional filters
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // Filter by organization type
  const searchQuery = url.searchParams.get("search");
  
  try {
    const supabase = await createClient();
    
    let query = supabase.from("organizations").select("*");

    // Apply type filter if provided
    if (type) {
      query = query.eq("type", type);
    }
    
    // Apply search filter if provided
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,industry.ilike.%${searchQuery}%`
      );
    }
    
    const { data, error } = await query.order("name");
    
    if (error) {
      logDatabaseError(error, "organizations", "getAll");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ organizations: data });
  } catch (err) {
    logDatabaseError(err, "organizations", "getAll_exception");
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST - Create a new organization
export async function POST(request: Request) {
  try {
    const organizationData = await request.json();
    const supabase = await createClient();
    
    // Validate the organization data
    if (!organizationData.name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from("organizations")
      .insert(organizationData as OrganizationInsert)
      .select()
      .single();
      
    if (error) {
      logDatabaseError(error, "organizations", "create");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logDatabaseError(err, "organizations", "create_exception");
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing organization
export async function PATCH(request: Request) {
  try {
    const organizationData = await request.json();
    const supabase = await createClient();
    
    // Validate the request
    if (!organizationData.id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }
    
    // Remove id from the update data
    const { id, ...updateData } = organizationData;
    
    const { data, error } = await supabase
      .from("organizations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      logDatabaseError(error, "organizations", "update");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    logDatabaseError(err, "organizations", "update_exception");
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
