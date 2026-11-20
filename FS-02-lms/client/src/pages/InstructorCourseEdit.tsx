import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGetCourseQuery, useUpdateCourseMutation, useCreateCourseMutation, useCreateSectionMutation, useCreateLessonMutation, useDeleteSectionMutation, useDeleteLessonMutation, useSubmitForReviewMutation } from '../features/courses/api';

export default function InstructorCourseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading, error, refetch } = useGetCourseQuery(id ?? '', { skip: !id });
  const [updateCourse] = useUpdateCourseMutation();
  const [createCourse] = useCreateCourseMutation();
  const [createSection] = useCreateSectionMutation();
  const [createLesson] = useCreateLessonMutation();
  const [deleteSection] = useDeleteSectionMutation();
  const [deleteLesson] = useDeleteLessonMutation();
  const [submitForReview] = useSubmitForReviewMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [priceCents, setPriceCents] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending_review' | 'published' | 'unpublished'>('draft');
  const [saving, setSaving] = useState(false);

  const isNew = !id;

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setCategory(course.category);
      setLevel(course.level);
      setPriceCents(course.priceCents);
      setCurrency(course.currency);
      setTags(course.tags.join(', '));
      setStatus(course.status);
      // Note: sections would need to be fetched separately in a real implementation
    }
  }, [course]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await createCourse({
          title,
          description,
          category,
          level,
          priceCents,
          currency,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          status: 'draft',
        }).unwrap();
        alert('Course created successfully!');
        navigate('/instructor');
      } else {
        await updateCourse({
          id,
          data: {
            title,
            description,
            category,
            level,
            priceCents,
            currency,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          },
        }).unwrap();
        await refetch();
        alert('Course saved successfully!');
      }
    } catch (err) {
      console.error(err);
      alert(isNew ? 'Failed to create course' : 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    try {
      await submitForReview(id).unwrap();
      await refetch();
      alert('Course submitted for review!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit for review');
    }
  };

  const handleAddSection = async () => {
    const newTitle = prompt('Section title:');
    if (!newTitle || !id) return;
    try {
      await createSection({ courseId: id, title: newTitle }).unwrap();
      await refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to add section');
    }
  };

  const handleAddLesson = async (sectionId: string) => {
    const lessonTitle = prompt('Lesson title:');
    if (!lessonTitle) return;
    const lessonType = prompt('Lesson type (video, quiz, text):') as 'video' | 'quiz' | 'text';
    if (!lessonType) return;
    try {
      await createLesson({
        sectionId,
        data: { title: lessonTitle, type: lessonType },
      }).unwrap();
      await refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to add lesson');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Course not found</p>
        <button onClick={() => navigate('/instructor')} className="text-indigo-600 hover:underline mt-4 inline-block">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{isNew ? 'Create New Course' : `Edit Course: ${course?.title}`}</h1>
        <div className="flex space-x-2">
          {!isNew && course && (
            <Link to={`/courses/${course.slug}`} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
              Preview
            </Link>
          )}
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : isNew ? 'Create Course' : 'Save Changes'}
          </button>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (cents)</label>
                  <input
                    type="number"
                    value={priceCents}
                    onChange={(e) => setPriceCents(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Curriculum</h2>
              <button onClick={handleAddSection} className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Add Section
              </button>
            </div>
            <div className="space-y-4">
              {isNew ? (
                <div className="text-center py-8 text-gray-500">
                  Save the course first to add sections and lessons
                </div>
              ) : (
                course?.sections?.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        defaultValue={section.title}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => deleteSection(section.id).unwrap().then(refetch).catch(console.error)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete Section
                      </button>
                    </div>
                    <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                      {section.lessons?.map((lesson) => (
                        <div key={lesson.id} className="flex items-center space-x-2 py-2">
                          <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-sm text-gray-500">⋮⋮</span>
                          <input
                            type="text"
                            defaultValue={lesson.title}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <select
                            defaultValue={lesson.type}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="video">Video</option>
                            <option value="quiz">Quiz</option>
                            <option value="text">Text</option>
                          </select>
                          <button
                            onClick={() => deleteLesson(lesson.id).unwrap().then(refetch).catch(console.error)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddLesson(section.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 mt-2"
                      >
                        Add Lesson
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'pending_review' | 'published' | 'unpublished')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
                <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400">Upload thumbnail</span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                {!isNew && status === 'draft' && (
                  <button
                    onClick={handleSubmitForReview}
                    className="w-full py-2 px-4 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                  >
                    Submit for Review
                  </button>
                )}
                {!isNew && status !== 'draft' && (
                  <div className="text-sm text-gray-500 text-center">
                    Status: {status.replace('_', ' ')}
                  </div>
                )}
                {isNew && (
                  <div className="text-sm text-gray-500 text-center">
                    Save the course first, then submit for review
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}