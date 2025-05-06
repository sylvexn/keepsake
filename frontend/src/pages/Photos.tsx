import React, { useEffect, useState, useRef } from "react";
import { Card } from "@heroui/react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import MainLayout from "../layouts/MainLayout";

interface Image {
  id: number;
  original_filename: string;
  saved_filename: string;
  url: string;
  file_extension: string;
  file_size: number;
  upload_timestamp: string;
}

interface ImagesResponse {
  images: Image[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const Photos = () => {
  // State for images and pagination
  const [imagesData, setImagesData] = useState<ImagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for filters
  const [filters, setFilters] = useState({
    filename: "",
    file_extension: "",
    date_from: "",
    date_to: "",
    sort_by: "upload_timestamp",
    sort_order: "DESC"
  });
  
  // State for modal
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // NEW: State for view mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // NEW: State for multi-selection
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  
  // NEW: State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | number[]>([]);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Ref to keep track of the latest total images count
  const prevTotalImagesRef = useRef<number | null>(null);

  // Fetch images with current filters and pagination
  const fetchImages = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "20",
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        )
      });

      const response = await fetch(`/api/images?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }
      
      const data = await response.json();
      setImagesData(data);
      
      // Check if we have new images
      if (prevTotalImagesRef.current !== null && data.total > prevTotalImagesRef.current) {
        console.log("New images detected!");
        // If we're not on the first page and new images were added, go to first page
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
      }
      
      // Update the reference
      prevTotalImagesRef.current = data.total;
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch images when page or filters change
  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  // Set up polling to check for new images
  useEffect(() => {
    // Poll every 10 seconds for new images
    const pollInterval = setInterval(() => {
      // Only poll if we're on page 1 with default sorting (newest first)
      if (currentPage === 1 && filters.sort_by === "upload_timestamp" && filters.sort_order === "DESC") {
        console.log("Polling for new images...");
        fetchImages();
      }
    }, 10000); // 10 seconds

    return () => clearInterval(pollInterval);
  }, [currentPage, filters.sort_by, filters.sort_order]);

  // Apply filters
  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchImages();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      filename: "",
      file_extension: "",
      date_from: "",
      date_to: "",
      sort_by: "upload_timestamp",
      sort_order: "DESC"
    });
    setCurrentPage(1);
    fetchImages();
  };

  // Open modal to view image
  const openImageModal = (image: Image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  // Copy URL to clipboard
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        // Could show toast notification here
        console.log("URL copied to clipboard");
      })
      .catch(err => {
        console.error("Failed to copy URL: ", err);
      });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // NEW: Toggle selection of an image
  const toggleImageSelection = (imageId: number) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  // NEW: Toggle all images selection
  const toggleSelectAll = () => {
    if (imagesData?.images.length === selectedImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(imagesData?.images.map(img => img.id) || []);
    }
  };

  // NEW: Delete a single image
  const confirmDeleteSingle = (imageId: number) => {
    setDeleteTarget(imageId);
    setShowDeleteConfirm(true);
  };

  // NEW: Delete multiple images
  const confirmDeleteMultiple = () => {
    if (selectedImages.length === 0) return;
    setDeleteTarget(selectedImages);
    setShowDeleteConfirm(true);
  };

  // NEW: Execute delete operation
  const executeDelete = async () => {
    setDeleteInProgress(true);
    try {
      // Handle single or multiple deletes
      if (Array.isArray(deleteTarget)) {
        // Multiple delete
        for (const id of deleteTarget) {
          await fetch(`/api/images/${id}`, {
            method: 'DELETE',
          });
        }
      } else {
        // Single delete
        await fetch(`/api/images/${deleteTarget}`, {
          method: 'DELETE',
        });
      }
      
      // Refresh images and reset selection
      fetchImages();
      setSelectedImages([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting image(s):", error);
    } finally {
      setDeleteInProgress(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Photos Gallery</h1>
        
        {/* Filters */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Filename</label>
              <Input
                type="text"
                value={filters.filename}
                onChange={(e) => setFilters({...filters, filename: e.target.value})}
                placeholder="Search by filename"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File Type</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.file_extension}
                onChange={(e) => setFilters({...filters, file_extension: e.target.value})}
              >
                <option value="">All Types</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="jpeg">JPEG</option>
                <option value="gif">GIF</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort By</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.sort_by}
                onChange={(e) => setFilters({...filters, sort_by: e.target.value})}
              >
                <option value="upload_timestamp">Upload Date</option>
                <option value="file_size">File Size</option>
                <option value="original_filename">Filename</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.sort_order}
                onChange={(e) => setFilters({...filters, sort_order: e.target.value})}
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </div>
            <div className="flex items-end space-x-2 col-span-1 md:col-span-2 lg:col-span-3">
              <Button type="submit">Apply Filters</Button>
              <Button type="button" variant="ghost" onClick={resetFilters}>Reset</Button>
            </div>
          </form>
        </Card>
        
        {/* Gallery Controls */}
        {!loading && imagesData?.images?.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={(imagesData?.images?.length ?? 0) === selectedImages.length && (imagesData?.images?.length ?? 0) > 0}
                  onChange={toggleSelectAll}
                  className="form-checkbox h-5 w-5 text-primary"
                />
                <span className="ml-2">Select All</span>
              </label>
              {selectedImages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={confirmDeleteMultiple}
                  className="flex items-center text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete ({selectedImages.length})
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Gallery */}
        {loading ? (
          <div className="flex justify-center my-12">
            <span className="loading">Loading images...</span>
          </div>
        ) : (
          <>
            {imagesData?.images.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">No images found matching your criteria.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {imagesData?.images.map((image) => (
                  <Card key={image.id} className={`overflow-hidden ${selectedImages.includes(image.id) ? 'ring-2 ring-primary' : ''}`}>
                    <div className="relative">
                      {/* Selection checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(image.id)}
                          onChange={() => toggleImageSelection(image.id)}
                          className="form-checkbox h-5 w-5 text-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {/* Delete button */}
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteSingle(image.id);
                          }}
                          className="p-1 bg-red-500 hover:bg-red-700 text-white rounded-full"
                          title="Delete image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                      <div 
                        className="h-48 bg-gray-100 cursor-pointer"
                        onClick={() => openImageModal(image)}
                      >
                        <img 
                          src={image.url} 
                          alt={image.original_filename || image.saved_filename} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="truncate text-sm font-medium">
                        {image.original_filename || image.saved_filename}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(image.file_size)}</span>
                        <span>{new Date(image.upload_timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => copyToClipboard(image.url)}
                        >
                          Copy URL
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => window.open(image.url, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {imagesData?.images.map((image) => (
                  <div 
                    key={image.id} 
                    className={`flex items-center border rounded-lg p-3 ${selectedImages.includes(image.id) ? 'bg-blue-50 border-primary' : 'bg-white'}`}
                  >
                    <div className="flex items-center space-x-3 w-16">
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.id)}
                        onChange={() => toggleImageSelection(image.id)}
                        className="form-checkbox h-5 w-5 text-primary"
                      />
                      <button
                        onClick={() => confirmDeleteSingle(image.id)}
                        className="p-1 bg-red-500 hover:bg-red-700 text-white rounded-full"
                        title="Delete image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    <div 
                      className="h-16 w-16 bg-gray-100 cursor-pointer mr-4 flex-shrink-0"
                      onClick={() => openImageModal(image)}
                    >
                      <img 
                        src={image.url} 
                        alt={image.original_filename || image.saved_filename} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium">
                        {image.original_filename || image.saved_filename}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(image.file_size)} • {formatDate(image.upload_timestamp)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(image.url)}
                      >
                        Copy URL
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(image.url, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {imagesData && imagesData.total_pages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex space-x-1">
                  {Array.from({ length: imagesData.total_pages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-muted'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Image Modal */}
        {selectedImage && (
          <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isModalOpen ? '' : 'hidden'}`}>
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold truncate">
                  {selectedImage.original_filename || selectedImage.saved_filename}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.original_filename || selectedImage.saved_filename}
                  className="mx-auto max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Size:</span> {formatFileSize(selectedImage.file_size)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedImage.file_extension}
                  </div>
                  <div>
                    <span className="font-medium">Uploaded:</span> {formatDate(selectedImage.upload_timestamp)}
                  </div>
                  <div>
                    <span className="font-medium">URL:</span>{" "}
                    <span className="text-xs truncate">{selectedImage.url}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                  <Button 
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedImage.url)}
                  >
                    Copy URL
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      setIsModalOpen(false);
                      confirmDeleteSingle(selectedImage.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                  <Button onClick={() => setIsModalOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-4">
                {Array.isArray(deleteTarget) 
                  ? `Are you sure you want to delete ${deleteTarget.length} selected image${deleteTarget.length > 1 ? 's' : ''}?` 
                  : 'Are you sure you want to delete this image?'}
                <br/>
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteInProgress}
                >
                  Cancel
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={executeDelete}
                  disabled={deleteInProgress}
                  className="text-red-500 hover:text-red-700"
                >
                  {deleteInProgress ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Photos; 