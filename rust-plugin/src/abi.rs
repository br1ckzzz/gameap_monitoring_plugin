//! GameAP WebAssembly Memory and ABI interop module.
//!
//! Handles low-level linear memory allocations, buffer marshaling,
//! and packed `u64` return values (upper 32 bits = pointer, lower 32 bits = size).

use prost::Message;

/// Packs a 32-bit pointer and 32-bit size into a 64-bit integer for WASM ABI return.
#[inline]
pub fn pack_ptr_size(ptr: u32, size: u32) -> u64 {
    ((ptr as u64) << 32) | (size as u64)
}

/// Unpacks a 64-bit integer into a 32-bit pointer and 32-bit size.
#[inline]
pub fn unpack_ptr_size(val: u64) -> (u32, u32) {
    let ptr = (val >> 32) as u32;
    let size = (val & 0xFFFF_FFFF) as u32;
    (ptr, size)
}

extern "C" {
    fn malloc(size: usize) -> *mut u8;
    fn free(ptr: *mut u8);
}

/// Allocates raw linear memory of specified byte size using libc dlmalloc.
/// Exported to the GameAP host (Wazero) so it can write input protobuf buffers.
#[no_mangle]
pub extern "C" fn allocate(size: u32) -> u32 {
    if size == 0 {
        return 0;
    }
    unsafe { malloc(size as usize) as u32 }
}

/// Deallocates previously allocated raw linear memory using libc dlmalloc.
#[no_mangle]
pub extern "C" fn deallocate(ptr: u32, _size: u32) {
    if ptr == 0 {
        return;
    }
    unsafe { free(ptr as *mut u8) }
}

/// Reads a protobuf message from host-provided memory pointer and size.
pub fn read_proto<M: Message + Default>(ptr: u32, size: u32) -> Result<M, prost::DecodeError> {
    if ptr == 0 || size == 0 {
        return Ok(M::default());
    }
    let slice = unsafe { std::slice::from_raw_parts(ptr as *const u8, size as usize) };
    M::decode(slice)
}

/// Serializes a protobuf message into newly allocated memory and returns packed (ptr, size) as `u64`.
pub fn write_proto<M: Message>(msg: &M) -> u64 {
    let mut buf = Vec::with_capacity(msg.encoded_len());
    if let Err(_) = msg.encode(&mut buf) {
        return 0;
    }
    write_bytes(&buf)
}

/// Writes a raw byte buffer into heap memory and returns packed (ptr, size) as `u64`.
pub fn write_bytes(bytes: &[u8]) -> u64 {
    let size = bytes.len() as u32;
    if size == 0 {
        return 0;
    }
    let ptr = allocate(size);
    if ptr == 0 {
        return 0;
    }
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr as *mut u8, bytes.len());
    }
    pack_ptr_size(ptr, size)
}
